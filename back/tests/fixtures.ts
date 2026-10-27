import { Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";

// Cria (ou reaproveita) um usuário ativo com o perfil informado; senha "123456"
export const ensureUser = async (email: string, roles: Role[], cpf: string) => {
  const passwordHash = await bcrypt.hash("123456", 4);
  return prisma.user.upsert({
    where: { email },
    update: { passwordHash, status: "ATIVO", roles },
    create: {
      email,
      username: email.split("@")[0],
      firstName: email.split("@")[0],
      passwordHash,
      roles,
      cpf,
      status: "ATIVO",
    },
  });
};
