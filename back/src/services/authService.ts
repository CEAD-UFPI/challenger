import { User } from "@prisma/client";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { prisma } from "../lib/prisma";
import { AuthUser, Role } from "../middlewares/auth";
import { AppError } from "../utils/AppError";

type OneTimeTokenType = "invite" | "reset";

export const buildSession = (
  user: User & { solicitantProfile?: { courseId: number } | null },
) => {
  const roles = user.roles as Role[];
  const isSolicitant =
    roles.includes("ADMIN") || roles.includes("COORDENACAO") || !!user.solicitantProfile;
  const courseId = user.courseId ?? user.solicitantProfile?.courseId ?? null;

  const payload: AuthUser = { id: user.id, roles, courseId, isSolicitant };
  const token = jwt.sign(payload, env.JWT_SECRET, { expiresIn: "8h" });

  const name =
    user.nomeSocial || `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.username;

  return {
    token,
    user: {
      id: user.id,
      name,
      username: user.username,
      email: user.email,
      roles,
      courseId,
      isSolicitant,
    },
  };
};

// Tokens de convite/reset são assinados com o hash atual da senha:
// assim que a senha muda, o link deixa de valer (uso único).
const oneTimeSecret = (user: Pick<User, "passwordHash">) =>
  env.JWT_SECRET + user.passwordHash;

export const signOneTimeToken = (
  user: Pick<User, "id" | "passwordHash">,
  type: OneTimeTokenType,
  expiresIn: "1h" | "48h",
) => jwt.sign({ id: user.id, type }, oneTimeSecret(user), { expiresIn });

export const verifyOneTimeToken = async (token: string, type: OneTimeTokenType) => {
  const invalid = new AppError("Link inválido ou expirado.", 401);

  const decoded = jwt.decode(token) as { id?: number; type?: string } | null;
  if (!decoded?.id || decoded.type !== type) throw invalid;

  const user = await prisma.user.findUnique({ where: { id: decoded.id } });
  if (!user) throw invalid;

  try {
    jwt.verify(token, oneTimeSecret(user));
  } catch {
    throw invalid;
  }
  return user;
};
