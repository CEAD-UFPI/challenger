import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireRoles } from "../middlewares/auth";
import { requiredId } from "../schemas/common";
import { parseId } from "../utils/params";

export const catalogRouter = Router();

const adminGuard = requireRoles(["ADMIN", "FINANCEIRO"]);
const text = (label: string) => z.string().trim().min(1, `Informe ${label}`);

// Cadastros simples: listagem para qualquer usuário logado; escrita só para gestão
const simpleCatalogs = [
  { path: "bancos", model: prisma.bank, schema: z.object({ nome: text("o nome") }), order: "nome" },
  { path: "cursos", model: prisma.course, schema: z.object({ nome: text("o nome") }), order: "nome" },
  { path: "destinos", model: prisma.destination, schema: z.object({ nome: text("o destino") }), order: "nome" },
  { path: "objetivos", model: prisma.solicitationObjective, schema: z.object({ objetivo: text("o objetivo") }), order: "objetivo" },
  {
    path: "tipos-diaria",
    model: prisma.dailyRateType,
    schema: z.object({ nome: text("o nome"), valor: z.coerce.number().positive("Valor deve ser positivo") }),
    order: "nome",
  },
] as const;

for (const { path, model, schema, order } of simpleCatalogs) {
  // Os delegates do Prisma não compartilham um tipo comum
  const delegate = model as any;

  catalogRouter.get(`/${path}`, async (_req, res) => {
    res.json(await delegate.findMany({ orderBy: { [order]: "asc" } }));
  });

  catalogRouter.post(`/${path}`, adminGuard, async (req, res) => {
    const item = await delegate.create({ data: schema.parse(req.body) });
    res.status(201).json(item);
  });

  catalogRouter.put(`/${path}/:id`, adminGuard, async (req, res) => {
    const item = await delegate.update({
      where: { id: parseId(req.params.id) },
      data: schema.partial().parse(req.body),
    });
    res.json(item);
  });

  catalogRouter.delete(`/${path}/:id`, adminGuard, async (req, res) => {
    await delegate.delete({ where: { id: parseId(req.params.id) } });
    res.json({ success: true });
  });
}

// --- Vínculo Usuário <-> Curso (Solicitantes) ---
const solicitantGuard = requireRoles(["ADMIN"]);

catalogRouter.get("/solicitantes", solicitantGuard, async (_req, res) => {
  const items = await prisma.solicitant.findMany({
    include: {
      user: { select: { id: true, firstName: true, lastName: true, email: true } },
      course: true,
    },
  });
  res.json(items);
});

catalogRouter.post("/solicitantes", solicitantGuard, async (req, res) => {
  const { userId, courseId } = z
    .object({ userId: requiredId, courseId: requiredId })
    .parse(req.body);
  const item = await prisma.solicitant.create({ data: { userId, courseId } });
  res.status(201).json(item);
});

catalogRouter.delete("/solicitantes/:id", solicitantGuard, async (req, res) => {
  await prisma.solicitant.delete({ where: { id: parseId(req.params.id) } });
  res.json({ success: true });
});
