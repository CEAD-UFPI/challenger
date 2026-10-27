import { Prisma } from "@prisma/client";
import crypto from "crypto";
import { Router } from "express";
import fs from "fs";
import multer from "multer";
import path from "path";
import { z } from "zod";
import { env } from "../config/env";
import { prisma } from "../lib/prisma";
import { AuthUser, hasAnyRole, requireRoles } from "../middlewares/auth";
import { AppError } from "../utils/AppError";
import { parseId } from "../utils/params";
import { solicitationScope } from "./solicitations.routes";

export const reportsRouter = Router();

const ALLOWED_TYPES: Record<string, string> = {
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/png": ".png",
};

fs.mkdirSync(env.UPLOAD_DIR, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: env.UPLOAD_DIR,
    // Nome aleatório: nunca usa o nome enviado pelo cliente no disco
    filename: (_req, file, cb) =>
      cb(null, `${crypto.randomUUID()}${ALLOWED_TYPES[file.mimetype]}`),
  }),
  limits: { fileSize: env.MAX_UPLOAD_MB * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_TYPES[file.mimetype]) return cb(null, true);
    cb(new AppError("Formato não permitido. Envie PDF, JPG ou PNG.", 400));
  },
});

const REVIEW_ROLES = ["ADMIN", "FINANCEIRO", "FADEX"] as const;

const reportInclude = {
  detail: { include: { agent: true, solicitation: true } },
  history: { orderBy: { data: "desc" } },
} satisfies Prisma.TravelReportInclude;

const filePath = (fileName: string) => path.join(env.UPLOAD_DIR, path.basename(fileName));

const removeFile = (fileName?: string | null) => {
  if (fileName) fs.promises.unlink(filePath(fileName)).catch(() => {});
};

// Relatório só é visível para quem enxerga a solicitação correspondente
const findVisibleReport = async (user: AuthUser, id: number) => {
  const where: Prisma.TravelReportWhereInput = hasAnyRole(user, [...REVIEW_ROLES])
    ? { id }
    : { id, detail: { solicitation: solicitationScope(user) } };
  const report = await prisma.travelReport.findFirst({ where, include: reportInclude });
  if (!report) throw new AppError("Relatório não encontrado", 404);
  return report;
};

reportsRouter.get("/relatorios", async (req, res) => {
  const user = req.user!;
  const where: Prisma.TravelReportWhereInput = hasAnyRole(user, [...REVIEW_ROLES])
    ? {}
    : { detail: { solicitation: solicitationScope(user) } };

  const reports = await prisma.travelReport.findMany({
    where,
    include: reportInclude,
    orderBy: { prazoLimite: "asc" },
  });
  res.json(reports);
});

// Agente (ou quem criou a solicitação) envia o comprovante e as atividades realizadas
reportsRouter.post("/relatorios/:id/comprovante", upload.single("file"), async (req, res) => {
  const user = req.user!;
  const id = parseId(req.params.id);

  try {
    if (!req.file) throw new AppError("Selecione o arquivo do comprovante.", 400);
    const { atividadesRealizadas } = z
      .object({
        atividadesRealizadas: z
          .string()
          .trim()
          .min(10, "Descreva as atividades realizadas (mín. 10 caracteres)"),
      })
      .parse(req.body);

    const report = await findVisibleReport(user, id);
    const isOwner =
      report.detail.agentId === user.id || report.detail.solicitation.requesterId === user.id;
    if (!isOwner && !hasAnyRole(user, ["ADMIN"])) {
      throw new AppError("Apenas o agente da viagem pode enviar o comprovante.", 403);
    }
    if (!["ABERTO", "EM_CORRECAO"].includes(report.status)) {
      throw new AppError("Este relatório já foi enviado e está em análise ou finalizado.", 409);
    }

    const updated = await prisma.travelReport.update({
      where: { id },
      data: {
        atividadesRealizadas,
        comprovanteUrl: req.file.filename,
        status: "FECHADO",
        history: { create: { acao: "ENVIADO" } },
      },
      include: reportInclude,
    });

    removeFile(report.comprovanteUrl);
    res.json(updated);
  } catch (err) {
    // Requisição recusada: o arquivo recém-gravado não deve ficar órfão
    removeFile(req.file?.filename);
    throw err;
  }
});

reportsRouter.get("/relatorios/:id/comprovante", async (req, res) => {
  const report = await findVisibleReport(req.user!, parseId(req.params.id));
  if (!report.comprovanteUrl) throw new AppError("Nenhum comprovante enviado.", 404);

  const file = filePath(report.comprovanteUrl);
  if (!fs.existsSync(file)) throw new AppError("Arquivo do comprovante não encontrado.", 404);
  res.download(file, `comprovante-relatorio-${report.id}${path.extname(file)}`);
});

const reviewSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("APPROVE"), observacao: z.string().trim().nullish() }),
  z.object({
    action: z.literal("REJECT"),
    motivoRecusa: z.enum(
      ["DOCUMENTACAO_INCOMPLETA", "DADOS_INCORRETOS", "FALTA_DE_COMPROVANTES", "OUTROS"],
      { error: "Informe o motivo da devolução" },
    ),
    observacao: z.string().trim().nullish(),
  }),
]);

// FADEX analisa a prestação de contas: aprova ou devolve para correção
reportsRouter.patch(
  "/relatorios/:id/status",
  requireRoles([...REVIEW_ROLES]),
  async (req, res) => {
    const id = parseId(req.params.id);
    const body = reviewSchema.parse(req.body);
    const report = await findVisibleReport(req.user!, id);

    if (report.status !== "FECHADO") {
      throw new AppError("Só é possível analisar relatórios enviados pelo agente.", 409);
    }

    const approve = body.action === "APPROVE";
    const updated = await prisma.travelReport.update({
      where: { id },
      data: {
        status: approve ? "APROVADO" : "EM_CORRECAO",
        history: {
          create: {
            acao: approve ? "APROVADO" : "DEVOLVIDO",
            motivoRecusa: approve ? null : body.motivoRecusa,
            observacao: body.observacao || null,
          },
        },
      },
      include: reportInclude,
    });
    res.json(updated);
  },
);
