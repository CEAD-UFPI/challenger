import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { AppError } from "../utils/AppError";

export type Role =
  | "ADMIN"
  | "FINANCEIRO"
  | "COORDENACAO"
  | "DIRECAO"
  | "FADEX"
  | "AGENTE";

export interface AuthUser {
  id: number;
  roles: Role[];
  courseId: number | null;
  isSolicitant: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export const authenticate = (req: Request, _res: Response, next: NextFunction) => {
  const [scheme, token] = req.headers.authorization?.split(" ") ?? [];
  if (scheme !== "Bearer" || !token) throw new AppError("Não autorizado", 401);

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as AuthUser & { type?: string };
    // Tokens de convite/reset de senha não servem como sessão
    if (payload.type) throw new Error();
    req.user = payload;
    next();
  } catch {
    throw new AppError("Sessão inválida ou expirada", 401);
  }
};

export const hasAnyRole = (user: AuthUser | undefined, roles: Role[]) =>
  !!user && user.roles.some((r) => roles.includes(r));

// Permite acesso se o usuário tiver algum dos papéis (ou for solicitante, se indicado)
export const requireRoles =
  (roles: Role[], opts: { allowSolicitant?: boolean } = {}) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (hasAnyRole(req.user, roles)) return next();
    if (opts.allowSolicitant && req.user?.isSolicitant) return next();
    throw new AppError("Acesso negado para o seu perfil", 403);
  };

// Papéis com visão global (não filtrada por curso)
export const SUPER_ROLES: Role[] = ["ADMIN", "FINANCEIRO", "DIRECAO"];
