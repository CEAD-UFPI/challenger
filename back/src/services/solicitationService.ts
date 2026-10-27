import { Prisma, SolicitationStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { AuthUser, Role } from "../middlewares/auth";
import { dateString, optionalString, requiredId } from "../schemas/common";
import { AppError } from "../utils/AppError";

export const MAX_DIARIAS = 3.5;

export const createSolicitationSchema = z
  .object({
    motivo: z.string().trim().min(1, "Informe o motivo"),
    origem: z.string().trim().min(1, "Informe a origem"),
    destino: z.string().trim().min(1, "Informe o destino"),
    dataIda: dateString,
    dataVolta: dateString,
    agentIds: z.array(requiredId).min(1, "Selecione ao menos um agente"),
    projetoId: requiredId,
    tipoDiariaId: requiredId,
    objectiveId: requiredId,
    qtdDiarias: z.coerce
      .number()
      .min(0, "Quantidade de diárias inválida")
      .max(MAX_DIARIAS, `Máximo de ${MAX_DIARIAS} diárias`)
      .refine((n) => Number.isInteger(n * 2), "Use múltiplos de 0,5"),
    bilhete: optionalString,
    meioTransporte: z.enum(["AEREO", "TERRESTRE", "FLUVIAL"]),
    tipoVeiculo: z.enum(["OFICIAL", "PROPRIO", "ALUGADO", "PUBLICO"]).nullish(),
    condutor: optionalString,
    placaVeiculo: optionalString,
    tipoViagem: z.enum(["NACIONAL", "INTERNACIONAL"]),
  })
  .refine((d) => d.dataVolta >= d.dataIda, {
    message: "A data de volta deve ser igual ou posterior à data de ida",
    path: ["dataVolta"],
  });

export type CreateSolicitationInput = z.infer<typeof createSolicitationSchema>;

export const solicitationInclude = {
  requester: { include: { course: true, banco: true } },
  details: {
    include: {
      agent: { include: { banco: true, course: true } },
      project: { include: { course: true } },
      dailyRateType: true,
      objective: true,
      origin: true,
      destiny: true,
      report: true,
    },
  },
} satisfies Prisma.SolicitationInclude;

// Status em que o solicitante pode corrigir e reenviar
export const EDITABLE_STATUSES: SolicitationStatus[] = ["RASCUNHO", "PENDENTE_CORRECAO"];

export type Action = "APPROVE" | "REJECT" | "PAY";

// Máquina de estados do fluxo de aprovação (Regra 3)
const TRANSITIONS: Record<
  Role,
  { from: SolicitationStatus; to: Partial<Record<Action, SolicitationStatus>> }[]
> = {
  DIRECAO: [
    {
      from: "AGUARDANDO_DIRECAO",
      to: { APPROVE: "AGUARDANDO_FINANCEIRO", REJECT: "PENDENTE_CORRECAO" },
    },
  ],
  FINANCEIRO: [
    {
      from: "AGUARDANDO_FINANCEIRO",
      to: { APPROVE: "APROVADO_PARA_PAGAMENTO", REJECT: "PENDENTE_CORRECAO" },
    },
  ],
  FADEX: [{ from: "APROVADO_PARA_PAGAMENTO", to: { PAY: "PAGO" } }],
  ADMIN: [],
  COORDENACAO: [],
  AGENTE: [],
};

export class SolicitationService {
  // Regra 5: agentes com relatório vencido não podem viajar novamente
  static async checkBlocklist(agentIds: number[]) {
    const overdue = await prisma.travelReport.findMany({
      where: {
        detail: { agentId: { in: agentIds } },
        status: { notIn: ["FECHADO", "APROVADO", "ARQUIVADO"] },
        prazoLimite: { lt: new Date() },
      },
      include: { detail: { include: { agent: true } } },
    });

    if (overdue.length > 0) {
      const names = [
        ...new Set(
          overdue.map(
            (r) => r.detail.agent.nomeSocial || r.detail.agent.firstName || r.detail.agent.email,
          ),
        ),
      ].join(", ");
      throw new AppError(`Bloqueado! Pendências de relatórios: ${names}`, 422);
    }
  }

  static async create(input: CreateSolicitationInput, requester: AuthUser) {
    const agentIds = [...new Set(input.agentIds)];
    await this.checkBlocklist(agentIds);

    const created = await prisma.solicitation.create({
      data: {
        requesterId: requester.id,
        motivoSolicitacao: input.motivo,
        origem: input.origem,
        destino: input.destino,
        dataIda: input.dataIda,
        dataVolta: input.dataVolta,
        status: "AGUARDANDO_DIRECAO",
        details: {
          create: agentIds.map((agentId) => this.detailData(agentId, input)),
        },
      },
    });

    return prisma.solicitation.findUnique({
      where: { id: created.id },
      include: solicitationInclude,
    });
  }

  // Solicitante corrige uma solicitação devolvida e a reenvia para a Direção
  static async resubmit(id: number, input: CreateSolicitationInput, user: AuthUser) {
    const sol = await prisma.solicitation.findUnique({ where: { id } });
    if (!sol) throw new AppError("Solicitação não encontrada", 404);
    if (sol.requesterId !== user.id && !user.roles.includes("ADMIN")) {
      throw new AppError("Apenas quem criou a solicitação pode corrigi-la.", 403);
    }
    if (!EDITABLE_STATUSES.includes(sol.status)) {
      throw new AppError("Só é possível corrigir solicitações devolvidas para correção.", 409);
    }

    const agentIds = [...new Set(input.agentIds)];
    await this.checkBlocklist(agentIds);

    // Os detalhes são recriados; o trigger gera novos relatórios com o prazo atualizado
    await prisma.$transaction([
      prisma.solicitationDetail.deleteMany({ where: { solicitationId: id } }),
      prisma.solicitation.update({
        where: { id },
        data: {
          motivoSolicitacao: input.motivo,
          origem: input.origem,
          destino: input.destino,
          dataIda: input.dataIda,
          dataVolta: input.dataVolta,
          status: "AGUARDANDO_DIRECAO",
          observacaoDevolucao: null,
          details: { create: agentIds.map((agentId) => this.detailData(agentId, input)) },
        },
      }),
    ]);

    return prisma.solicitation.findUnique({ where: { id }, include: solicitationInclude });
  }

  private static detailData(agentId: number, input: CreateSolicitationInput) {
    return {
      agentId,
      projectId: input.projetoId,
      dailyRateTypeId: input.tipoDiariaId,
      objectiveId: input.objectiveId,
      qtdDiarias: input.qtdDiarias,
      bilhete: input.bilhete,
      autorizada: false,
      meioTransporte: input.meioTransporte,
      tipoVeiculo: input.tipoVeiculo ?? null,
      condutor: input.condutor,
      placaVeiculo: input.placaVeiculo,
      tipoViagem: input.tipoViagem,
    };
  }

  static async updateStatus(
    solicitationId: number,
    user: AuthUser,
    requestedRole: Role | undefined,
    action: Action,
    reason?: string | null,
  ) {
    const sol = await prisma.solicitation.findUnique({ where: { id: solicitationId } });
    if (!sol) throw new AppError("Solicitação não encontrada", 404);

    // Os papéis vêm sempre do token. O papel enviado pelo cliente (perfil ativo)
    // só define a prioridade, nunca concede permissão.
    const roles =
      requestedRole && user.roles.includes(requestedRole)
        ? [requestedRole, ...user.roles.filter((r) => r !== requestedRole)]
        : user.roles;

    for (const role of roles) {
      const rule = TRANSITIONS[role]?.find((t) => t.from === sol.status);
      const newStatus = rule?.to[action];
      if (newStatus) {
        return prisma.solicitation.update({
          where: { id: solicitationId },
          data: {
            status: newStatus,
            observacaoDevolucao: action === "REJECT" ? reason || null : null,
          },
          include: solicitationInclude,
        });
      }
    }

    throw new AppError(
      `Ação "${action}" não permitida para a solicitação no status ${sol.status}`,
      409,
    );
  }
}
