import { Prisma } from "@prisma/client";
import { NextFunction, Request, Response } from "express";
import { MulterError } from "multer";
import { ZodError } from "zod";
import { AppError } from "../utils/AppError";

const UNIQUE_FIELD_LABELS: Record<string, string> = {
  email: "E-mail",
  cpf: "CPF",
  rg: "RG",
  telefone: "Telefone",
  celular: "Celular",
  username: "Nome de usuário",
  numTed: "Nº do TED",
  nome: "Nome",
  objetivo: "Objetivo",
  userId: "Usuário",
};

export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  if (err instanceof MulterError) {
    const msg =
      err.code === "LIMIT_FILE_SIZE" ? "Arquivo excede o tamanho máximo permitido." : err.message;
    return res.status(400).json({ error: msg });
  }

  if (err instanceof ZodError) {
    const first = err.issues[0];
    const field = first?.path.join(".");
    return res.status(400).json({
      error: field ? `${field}: ${first.message}` : first?.message,
      issues: err.issues,
    });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      const target = (err.meta?.target as string[] | undefined) ?? [];
      const label = target.map((t) => UNIQUE_FIELD_LABELS[t] ?? t).join(", ");
      return res
        .status(409)
        .json({ error: label ? `${label} já cadastrado.` : "Registro duplicado." });
    }
    if (err.code === "P2025") {
      return res.status(404).json({ error: "Registro não encontrado." });
    }
    if (err.code === "P2003") {
      return res
        .status(409)
        .json({ error: "Registro possui vínculos e não pode ser removido/alterado." });
    }
  }

  console.error("[Erro não tratado]", err);
  return res.status(500).json({ error: "Erro interno do servidor." });
};
