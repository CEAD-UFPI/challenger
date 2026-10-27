import { rateLimit } from "express-rate-limit";
import { env } from "../config/env";

const WINDOW_MS = 15 * 60 * 1000;
const message = { error: "Muitas tentativas. Aguarde 15 minutos e tente novamente." };

// Login e troca de senha: só tentativas que falham consomem a cota (força bruta)
export const authRateLimit = rateLimit({
  windowMs: WINDOW_MS,
  limit: env.LOGIN_RATE_LIMIT,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message,
});

// Recuperação de senha sempre responde 200, então toda chamada conta (evita spam de e-mail)
export const emailRateLimit = rateLimit({
  windowMs: WINDOW_MS,
  limit: env.LOGIN_RATE_LIMIT,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message,
});
