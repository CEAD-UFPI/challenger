import { Gender, PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import "dotenv/config";

const prisma = new PrismaClient();

async function main() {
  // Senha inicial do admin. Em produção, defina SEED_ADMIN_PASSWORD e troque após o 1º acesso.
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "123456";
  if (!process.env.SEED_ADMIN_PASSWORD) {
    console.warn("⚠️  SEED_ADMIN_PASSWORD não definida: usando a senha padrão 123456.");
  }
  const passwordHash = await bcrypt.hash(adminPassword, 10);
  // Dados de demonstração (professor de exemplo) só com SEED_DEMO=true
  const withDemo = process.env.SEED_DEMO === "true";

  console.log("🌱 Iniciando Seed...");

  // 1. BANCOS
  const bb = await prisma.bank.upsert({
    where: { nome: "Banco do Brasil" },
    update: {},
    create: { nome: "Banco do Brasil" },
  });

  // 2. CURSOS
  const cursoHistoria = await prisma.course.upsert({
    where: { nome: "HISTÓRIA" },
    update: {},
    create: { nome: "HISTÓRIA" },
  });

  await prisma.course.upsert({
    where: { nome: "COMPUTAÇÃO" },
    update: {},
    create: { nome: "COMPUTAÇÃO" },
  });

  // 3. OBJETIVOS DE SOLICITAÇÃO
  await prisma.solicitationObjective.upsert({
    where: { objetivo: "PARTICIPAÇÃO EM EVENTO" },
    update: {},
    create: { objetivo: "PARTICIPAÇÃO EM EVENTO" },
  });

  // 4. TIPOS DE DIÁRIA
  await prisma.dailyRateType.upsert({
    where: { nome: "NACIONAL - PROFESSOR" },
    update: {},
    create: { nome: "NACIONAL - PROFESSOR", valor: 320.0 },
  });

  // 5. DESTINOS
  await prisma.destination.upsert({
    where: { nome: "TERESINA - PI" },
    update: {},
    create: { nome: "TERESINA - PI" },
  });

  await prisma.destination.upsert({
    where: { nome: "PARNAÍBA - PI" },
    update: {},
    create: { nome: "PARNAÍBA - PI" },
  });

  // 6. PROJETOS (Campos obrigatórios conforme seu Schema)
  await prisma.project.upsert({
    where: { numTed: "TED-001/2024" },
    update: {},
    create: {
      nomeDoProjeto: "PESQUISA DE CAMPO NORDESTE",
      numTed: "TED-001/2024",
      dtInicial: new Date("2024-01-01"),
      dtFinal: new Date("2024-12-31"),
      contaCorrente: "12345-6",
      saldo: 50000.0,
      courseId: cursoHistoria.id,
    },
  });

  // 7. USUÁRIOS
  // Admin
  await prisma.user.upsert({
    where: { email: "admin@ufpi.edu.br" },
    update: {},
    create: {
      email: "admin@ufpi.edu.br",
      username: "admin",
      firstName: "Admin",
      lastName: "Sistema",
      passwordHash,
      roles: [Role.ADMIN, Role.FINANCEIRO],
      status: "ATIVO",
      cpf: "00000000000",
    },
  });

  if (!withDemo) {
    console.log("✅ Seed finalizado (sem dados de demonstração).");
    return;
  }

  // Professor (Agente) - demonstração
  const professor = await prisma.user.upsert({
    where: { email: "professor@ufpi.edu.br" },
    update: {},
    create: {
      email: "professor@ufpi.edu.br",
      username: "professor",
      firstName: "Wesley",
      lastName: "Silva",
      passwordHash,
      roles: [Role.AGENTE],
      status: "ATIVO",
      cpf: "11122233344",
      bankId: bb.id,
      courseId: cursoHistoria.id,
      genero: Gender.MASCULINO,
    },
  });

  // 8. VÍNCULO DE SOLICITANTE (A tabela pivot 'Solicitant')
  await prisma.solicitant.upsert({
    where: { userId: professor.id }, // userId é @unique no seu schema
    update: { courseId: cursoHistoria.id },
    create: {
      userId: professor.id,
      courseId: cursoHistoria.id,
    },
  });

  console.log("✅ Seed finalizado com sucesso!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
