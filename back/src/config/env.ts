import "dotenv/config";
import path from "path";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL é obrigatória"),
  JWT_SECRET: z.string().min(1).optional(),
  // Origem(ns) do frontend liberadas no CORS, separadas por vírgula
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  // URL pública do frontend, usada nos links enviados por e-mail
  FRONTEND_URL: z.string().default("http://localhost:5173"),
  // Pasta onde os comprovantes dos relatórios de viagem são gravados
  UPLOAD_DIR: z.string().default("./uploads"),
  MAX_UPLOAD_MB: z.coerce.number().positive().default(10),
  // Nº de proxies à frente da API (1 atrás do Nginx). Necessário p/ o limite por IP.
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
  // Tentativas de login / recuperação de senha por IP a cada 15 minutos
  LOGIN_RATE_LIMIT: z.coerce.number().int().positive().default(10),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error("❌ Variáveis de ambiente inválidas:", parsed.error.issues);
  process.exit(1);
}

const data = parsed.data;

if (!data.JWT_SECRET && data.NODE_ENV === "production") {
  console.error("❌ JWT_SECRET é obrigatória em produção.");
  process.exit(1);
}

export const env = {
  ...data,
  UPLOAD_DIR: path.resolve(data.UPLOAD_DIR),
  JWT_SECRET: data.JWT_SECRET || "dev-secret-nao-usar-em-producao",
  CORS_ORIGINS: data.CORS_ORIGIN.split(",").map((o) => o.trim()),
};
