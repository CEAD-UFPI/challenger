import { z } from "zod";

// Aceita "" / null / undefined como ausente
export const optionalString = z
  .string()
  .trim()
  .nullish()
  .transform((v) => (v ? v : null));

export const optionalId = z
  .union([z.coerce.number().int().positive(), z.literal(""), z.null()])
  .optional()
  .transform((v) => (v === "" || v == null ? null : v));

export const requiredId = z.coerce.number().int().positive();

export const dateString = z
  .union([z.string(), z.date()])
  .transform((v, ctx) => {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) {
      ctx.addIssue({ code: "custom", message: "Data inválida" });
      return z.NEVER;
    }
    return d;
  });

export const onlyDigits = (v: string) => v.replace(/\D/g, "");

export const password = z.string().min(6, "A senha deve ter ao menos 6 caracteres");
