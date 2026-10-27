import bcrypt from "bcryptjs";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authenticate } from "../middlewares/auth";
import { authRateLimit, emailRateLimit } from "../middlewares/rateLimit";
import { password } from "../schemas/common";
import { sendResetPasswordEmail } from "../services/emailService";
import {
  buildSession,
  verifyOneTimeToken,
  signOneTimeToken,
} from "../services/authService";
import { AppError } from "../utils/AppError";

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().min(1),
  password: z.string().min(1),
});

authRouter.post("/login", authRateLimit, async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);

  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    include: { solicitantProfile: true },
  });

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new AppError("Credenciais inválidas.", 401);
  }
  if (user.status !== "ATIVO") {
    throw new AppError("Sua conta está pendente de ativação ou foi bloqueada.", 403);
  }

  res.json(buildSession(user));
});

// Dados do usuário logado (também usado para restaurar a sessão no frontend)
authRouter.get("/me", authenticate, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    include: { course: true, banco: true, solicitantProfile: true },
  });
  if (!user) throw new AppError("Usuário não encontrado", 404);

  const { user: sessionUser } = buildSession(user);
  res.json({ ...user, ...sessionUser });
});

const updateMeSchema = z.object({
  telefone: z.string().trim().nullish(),
  celular: z.string().trim().nullish(),
  cep: z.string().trim().nullish(),
  endereco: z.string().trim().nullish(),
  numero: z.string().trim().nullish(),
  bairro: z.string().trim().nullish(),
  cidade: z.string().trim().nullish(),
  estado: z
    .enum([
      "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA",
      "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
    ])
    .or(z.literal(""))
    .nullish(),
  bancoId: z.union([z.coerce.number().int(), z.literal(""), z.null()]).optional(),
  bankId: z.union([z.coerce.number().int(), z.literal(""), z.null()]).optional(),
  agencia: z.string().trim().nullish(),
  conta: z.string().trim().nullish(),
});

// O agente só pode alterar contato, endereço e dados bancários.
// Demais campos enviados (id, roles, cpf...) são ignorados.
authRouter.put("/me", authenticate, async (req, res) => {
  const body = updateMeSchema.parse(req.body);
  const rawBank = body.bancoId !== undefined ? body.bancoId : body.bankId;
  const empty = (v: string | null | undefined) => (v === undefined ? undefined : v || null);

  const user = await prisma.user.update({
    where: { id: req.user!.id },
    data: {
      telefone: empty(body.telefone),
      celular: empty(body.celular),
      cep: empty(body.cep),
      endereco: empty(body.endereco),
      numero: empty(body.numero),
      bairro: empty(body.bairro),
      cidade: empty(body.cidade),
      estado: body.estado === undefined ? undefined : body.estado || null,
      bankId: rawBank === undefined ? undefined : rawBank || null,
      agencia: empty(body.agencia),
      conta: empty(body.conta),
    },
    include: { course: true, banco: true },
  });

  res.json({ message: "Perfil atualizado com sucesso!", user });
});

const changePasswordSchema = z
  .object({
    senhaAtual: z.string().min(1, "Informe a senha atual"),
    novaSenha: password,
  })
  .refine((d) => d.senhaAtual !== d.novaSenha, {
    message: "A nova senha deve ser diferente da atual",
    path: ["novaSenha"],
  });

// Troca de senha pelo próprio usuário logado
authRouter.put("/me/senha", authenticate, authRateLimit, async (req, res) => {
  const { senhaAtual, novaSenha } = changePasswordSchema.parse(req.body);
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user || !(await bcrypt.compare(senhaAtual, user.passwordHash))) {
    throw new AppError("Senha atual incorreta.", 400);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(novaSenha, 10) },
  });
  res.json({ message: "Senha alterada com sucesso!" });
});

authRouter.post("/auth/forgot-password", emailRateLimit, async (req, res) => {
  const { email } = z
    .object({ email: z.string().trim().toLowerCase().email("E-mail inválido") })
    .parse(req.body);

  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
  });

  // Resposta idêntica exista ou não o e-mail (evita enumeração de usuários)
  if (user && user.status !== "BLOQUEADO") {
    const token = signOneTimeToken(user, "reset", "1h");
    await sendResetPasswordEmail(
      user.email,
      user.nomeSocial || user.firstName || "Usuário",
      token,
    );
  }

  res.json({
    message: "Se o e-mail estiver cadastrado, você receberá um link de recuperação.",
  });
});

const tokenPasswordSchema = z.object({
  token: z.string().min(1, "Token ausente"),
  password,
});

authRouter.post("/auth/reset-password", async (req, res) => {
  const { token, password } = tokenPasswordSchema.parse(req.body);
  const user = await verifyOneTimeToken(token, "reset");

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await bcrypt.hash(password, 10),
      // Quem ainda não concluiu o convite é ativado (a posse do e-mail foi comprovada)
      ...(user.status === "PENDENTE" && { status: "ATIVO" }),
    },
  });

  res.json({ message: "Senha alterada com sucesso!" });
});

// Agente define a senha pelo link do convite e ativa a conta
authRouter.post("/users/completar-cadastro", async (req, res) => {
  const { token, password } = tokenPasswordSchema.parse(req.body);
  const user = await verifyOneTimeToken(token, "invite");

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(password, 10), status: "ATIVO" },
  });

  res.json({ message: "Senha criada! Você já pode fazer login." });
});

