import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { Request, Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { hasAnyRole, requireRoles, Role, SUPER_ROLES } from "../middlewares/auth";
import { onlyDigits, optionalId, optionalString } from "../schemas/common";
import { signOneTimeToken } from "../services/authService";
import { sendConfirmationEmail } from "../services/emailService";
import { AppError } from "../utils/AppError";
import { parseId } from "../utils/params";

export const usersRouter = Router();

const ROLES = ["ADMIN", "FINANCEIRO", "COORDENACAO", "DIRECAO", "FADEX", "AGENTE"] as const;

const userSchema = z.object({
  firstName: z.string().trim().min(1, "Informe o nome"),
  lastName: optionalString,
  nomeSocial: optionalString,
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
  cpf: z
    .string()
    .transform(onlyDigits)
    .refine((v) => v.length === 11, "CPF deve ter 11 dígitos"),
  role: z.enum(ROLES).optional(),
  roles: z.array(z.enum(ROLES)).optional(),
  courseId: optionalId,
  bankId: optionalId,
  agencia: optionalString,
  conta: optionalString,
});

// Quem pode gerenciar quais usuários:
// - ADMIN/FINANCEIRO: qualquer usuário (só ADMIN atribui perfis além de AGENTE)
// - Solicitante: apenas agentes do próprio curso
const canManageAll = (req: Request) => hasAnyRole(req.user, ["ADMIN", "FINANCEIRO"]);

const resolveRoles = (req: Request, body: { role?: Role; roles?: Role[] }) => {
  const requested: Role[] = body.roles?.length ? body.roles : body.role ? [body.role] : ["AGENTE"];
  if (hasAnyRole(req.user, ["ADMIN"])) return requested;
  if (requested.some((r) => r !== "AGENTE")) {
    throw new AppError("Apenas administradores podem atribuir outros perfis além de AGENTE", 403);
  }
  return requested;
};

const resolveCourse = (req: Request, courseId: number | null) => {
  if (canManageAll(req)) return courseId;
  if (!req.user!.courseId) throw new AppError("Seu usuário não está vinculado a um curso", 403);
  return req.user!.courseId;
};

const assertCanManage = async (req: Request, userId: number) => {
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) throw new AppError("Usuário não encontrado", 404);
  if (canManageAll(req)) {
    if (target.roles.includes("ADMIN") && !hasAnyRole(req.user, ["ADMIN"])) {
      throw new AppError("Apenas administradores podem alterar outro administrador", 403);
    }
    return target;
  }
  const onlyAgent = target.roles.every((r) => r === "AGENTE");
  if (!onlyAgent || target.courseId !== req.user!.courseId) {
    throw new AppError("Você só pode gerenciar agentes do seu curso", 403);
  }
  return target;
};

// Listagem: gestores veem todos; demais, apenas usuários do próprio curso
usersRouter.get("/users", async (req, res) => {
  const user = req.user!;
  let where: Prisma.UserWhereInput = {};

  if (!hasAnyRole(user, [...SUPER_ROLES, "FADEX"])) {
    if (!user.courseId) return res.json([]);
    where = { courseId: user.courseId };
  }

  const users = await prisma.user.findMany({
    where,
    include: { course: { select: { id: true, nome: true } } },
    orderBy: { firstName: "asc" },
  });
  res.json(users);
});

const manageGuard = requireRoles(["ADMIN", "FINANCEIRO"], { allowSolicitant: true });

// Cria o usuário com senha aleatória e envia convite para ele definir a própria senha
usersRouter.post("/users", manageGuard, async (req, res) => {
  const data = userSchema.parse(req.body);
  const roles = resolveRoles(req, data);
  const courseId = resolveCourse(req, data.courseId);

  const passwordHash = await bcrypt.hash(crypto.randomBytes(24).toString("hex"), 10);
  const username = await uniqueUsername(data.email.split("@")[0]);

  const user = await prisma.user.create({
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      nomeSocial: data.nomeSocial,
      email: data.email,
      cpf: data.cpf,
      username,
      passwordHash,
      roles,
      courseId,
      bankId: data.bankId,
      agencia: data.agencia,
      conta: data.conta,
      status: "PENDENTE",
    },
  });

  const token = signOneTimeToken(user, "invite", "48h");
  // O cadastro não é perdido se o e-mail falhar; o link fica no log do servidor
  const sent = await sendConfirmationEmail(
    user.email,
    user.nomeSocial || user.firstName || "Agente",
    token,
  ).catch(() => false);

  if (sent) {
    res.status(201).json({ message: "Usuário criado e e-mail de convite enviado!", user });
  } else {
    console.warn(`Convite não enviado para ${user.email}.`);
    res.status(201).json({
      message: "Usuário criado, mas o e-mail de convite não pôde ser enviado. Contate o suporte.",
      user,
    });
  }
});

usersRouter.put("/users/:id", manageGuard, async (req, res) => {
  const id = parseId(req.params.id);
  await assertCanManage(req, id);

  const data = userSchema.partial().parse(req.body);
  const roles = data.role || data.roles ? resolveRoles(req, data) : undefined;

  const user = await prisma.user.update({
    where: { id },
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      nomeSocial: data.nomeSocial,
      email: data.email,
      cpf: data.cpf,
      roles,
      courseId: data.courseId !== undefined ? resolveCourse(req, data.courseId) : undefined,
      bankId: data.bankId,
      agencia: data.agencia,
      conta: data.conta,
    },
  });

  res.json({ message: "Usuário atualizado com sucesso", user });
});

usersRouter.delete("/users/:id", manageGuard, async (req, res) => {
  const id = parseId(req.params.id);
  if (id === req.user!.id) throw new AppError("Você não pode excluir o próprio usuário", 400);
  await assertCanManage(req, id);

  await prisma.user.delete({ where: { id } });
  res.json({ success: true });
});

const uniqueUsername = async (base: string) => {
  const clean = base.toLowerCase().replace(/[^a-z0-9._-]/g, "") || "usuario";
  let candidate = clean;
  for (let i = 1; await prisma.user.findUnique({ where: { username: candidate } }); i++) {
    candidate = `${clean}${i}`;
  }
  return candidate;
};
