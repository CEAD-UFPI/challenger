import { Prisma } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { AuthUser, hasAnyRole, requireRoles } from "../middlewares/auth";
import {
  createSolicitationSchema,
  SolicitationService,
  solicitationInclude,
} from "../services/solicitationService";
import { AppError } from "../utils/AppError";
import { parseId } from "../utils/params";

export const solicitationsRouter = Router();

// Escopo de visualização:
// - ADMIN/FINANCEIRO/DIRECAO/FADEX: todas
// - Solicitante/Coordenação: as do seu curso + as suas
// - Agente: apenas as que criou ou em que viaja
export const solicitationScope = (user: AuthUser): Prisma.SolicitationWhereInput => {
  if (hasAnyRole(user, ["ADMIN", "FINANCEIRO", "DIRECAO", "FADEX"])) return {};

  const own: Prisma.SolicitationWhereInput[] = [
    { requesterId: user.id },
    { details: { some: { agentId: user.id } } },
  ];
  if ((user.isSolicitant || hasAnyRole(user, ["COORDENACAO"])) && user.courseId) {
    own.push({ requester: { courseId: user.courseId } });
  }
  return { OR: own };
};

solicitationsRouter.get("/solicitacoes", async (req, res) => {
  const items = await prisma.solicitation.findMany({
    where: solicitationScope(req.user!),
    include: solicitationInclude,
    orderBy: { createdAt: "desc" },
  });
  res.json(items);
});

solicitationsRouter.get("/solicitacoes/:id", async (req, res) => {
  const item = await prisma.solicitation.findFirst({
    where: { AND: [{ id: parseId(req.params.id) }, solicitationScope(req.user!)] },
    include: solicitationInclude,
  });
  if (!item) throw new AppError("Solicitação não encontrada.", 404);
  res.json(item);
});

// Corrigir e reenviar (somente em PENDENTE_CORRECAO/RASCUNHO)
solicitationsRouter.put("/solicitacoes/:id", async (req, res) => {
  const input = createSolicitationSchema.parse(req.body);
  const result = await SolicitationService.resubmit(parseId(req.params.id), input, req.user!);
  res.json(result);
});

solicitationsRouter.post(
  "/solicitacoes",
  requireRoles(["ADMIN"], { allowSolicitant: true }),
  async (req, res) => {
    const input = createSolicitationSchema.parse(req.body);
    const result = await SolicitationService.create(input, req.user!);
    res.status(201).json(result);
  },
);

const statusSchema = z.object({
  action: z.enum(["APPROVE", "REJECT", "PAY"]),
  role: z.enum(["ADMIN", "FINANCEIRO", "COORDENACAO", "DIRECAO", "FADEX", "AGENTE"]).optional(),
  reason: z.string().trim().nullish(),
});

solicitationsRouter.patch(
  "/solicitacoes/:id/status",
  requireRoles(["DIRECAO", "FINANCEIRO", "FADEX"]),
  async (req, res) => {
    const { action, role, reason } = statusSchema.parse(req.body);
    if (action === "REJECT" && !reason) {
      throw new AppError("Informe o motivo da devolução", 400);
    }
    const result = await SolicitationService.updateStatus(
      parseId(req.params.id),
      req.user!,
      role,
      action,
      reason,
    );
    res.json(result);
  },
);

// Exclui a solicitação (somente quem criou ou ADMIN, e antes do processamento financeiro)
solicitationsRouter.delete("/solicitacoes/:id", async (req, res) => {
  const id = parseId(req.params.id);
  const sol = await prisma.solicitation.findUnique({ where: { id } });
  if (!sol) throw new AppError("Solicitação não encontrada.", 404);

  if (sol.requesterId !== req.user!.id && !hasAnyRole(req.user, ["ADMIN"])) {
    throw new AppError("Apenas quem criou a solicitação pode excluí-la.", 403);
  }
  if (["APROVADO_PARA_PAGAMENTO", "PAGO"].includes(sol.status)) {
    throw new AppError("Viagens já processadas financeiramente não podem ser excluídas.", 403);
  }

  // onDelete: Cascade remove detalhes e relatórios vinculados
  await prisma.solicitation.delete({ where: { id } });
  res.json({ success: true });
});
