import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { hasAnyRole, requireRoles } from "../middlewares/auth";
import { dateString, optionalId } from "../schemas/common";
import { AppError } from "../utils/AppError";
import { parseId } from "../utils/params";

export const projectsRouter = Router();

const projectSchema = z
  .object({
    nomeDoProjeto: z.string().trim().min(1, "Informe o nome do projeto"),
    numTed: z.string().trim().min(1, "Informe o número do TED"),
    dtInicial: dateString,
    dtFinal: dateString,
    contaCorrente: z.string().trim().min(1, "Informe a conta corrente"),
    saldo: z.coerce.number().min(0, "Saldo não pode ser negativo").default(0),
    courseId: optionalId,
  })
  .refine((p) => p.dtFinal >= p.dtInicial, {
    message: "A data final deve ser posterior à inicial",
    path: ["dtFinal"],
  });

const manageGuard = requireRoles(["ADMIN", "FINANCEIRO"], { allowSolicitant: true });

projectsRouter.get("/projetos", async (_req, res) => {
  const items = await prisma.project.findMany({
    include: { course: true },
    orderBy: { nomeDoProjeto: "asc" },
  });
  res.json(items);
});

projectsRouter.post("/projetos", manageGuard, async (req, res) => {
  const data = projectSchema.parse(req.body);
  const item = await prisma.project.create({
    data: { ...data, courseId: data.courseId ?? req.user!.courseId },
  });
  res.status(201).json(item);
});

projectsRouter.put("/projetos/:id", manageGuard, async (req, res) => {
  const id = parseId(req.params.id);
  await assertCanManageProject(req.user!, id);
  const data = projectSchema.parse(req.body);

  const item = await prisma.project.update({
    where: { id },
    data: { ...data, courseId: data.courseId ?? undefined },
  });
  res.json(item);
});

projectsRouter.delete("/projetos/:id", manageGuard, async (req, res) => {
  const id = parseId(req.params.id);
  await assertCanManageProject(req.user!, id);
  await prisma.project.delete({ where: { id } });
  res.json({ success: true });
});

// Solicitantes só alteram projetos do próprio curso
const assertCanManageProject = async (
  user: NonNullable<Express.Request["user"]>,
  id: number,
) => {
  if (hasAnyRole(user, ["ADMIN", "FINANCEIRO"])) return;
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) throw new AppError("Projeto não encontrado", 404);
  if (project.courseId !== user.courseId) {
    throw new AppError("Você só pode alterar projetos do seu curso", 403);
  }
};
