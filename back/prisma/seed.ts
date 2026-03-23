import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Senha padrão para todos: "123456"
  const passwordHash = await bcrypt.hash("123456", 10);

  // 1. Criar ADMIN (Acesso Total: Cadastros + Financeiro)
  const admin = await prisma.user.upsert({
    where: { email: "admin@ufpi.edu.br" },
    update: { status: "ATIVO", podeRemanejarCredito: true },
    create: {
      email: "admin@ufpi.edu.br",
      username: "admin",
      firstName: "Administrador",
      lastName: "do Sistema",
      passwordHash,
      roles: [Role.ADMIN, Role.FINANCEIRO], // Enum seguro
      cpf: "00000000000",
      status: "ATIVO",
      podeRemanejarCredito: true,
    },
  });

  // 2. Criar AGENTE (Professor) com Banco Relacional
  const professor = await prisma.user.upsert({
    where: { email: "professor@ufpi.edu.br" },
    update: { status: "ATIVO" },
    create: {
      email: "professor@ufpi.edu.br",
      username: "professor",
      firstName: "Prof. Wesley",
      lastName: "Silva",
      passwordHash,
      roles: [Role.AGENTE],
      cpf: "11122233344",
      status: "ATIVO",
      // CORREÇÃO AQUI: Em vez de string, usamos objeto de conexão
      banco: {
        connectOrCreate: {
          where: { nome: "Banco do Brasil" },
          create: { nome: "Banco do Brasil" },
        },
      },
    },
  });

  // 3. Criar COORDENADOR (Solicitante)
  const coord = await prisma.user.upsert({
    where: { email: "coord@ufpi.edu.br" },
    update: { status: "ATIVO" },
    create: {
      email: "coord@ufpi.edu.br",
      username: "coordenador",
      firstName: "Coordenação",
      lastName: "Pedagógica",
      passwordHash,
      roles: [Role.COORDENACAO],
      cpf: "99988877766",
      status: "ATIVO",
    },
  });

  console.log("✅ Banco de dados populado com sucesso!");
  console.log({ admin, professor, coord });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
