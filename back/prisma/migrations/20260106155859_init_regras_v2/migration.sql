-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'FINANCEIRO', 'COORDENACAO', 'DIRECAO', 'FADEX', 'AGENTE');

-- CreateEnum
CREATE TYPE "State" AS ENUM ('AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO');

-- CreateEnum
CREATE TYPE "Titulacao" AS ENUM ('GRADUACAO', 'ESPECIALIZACAO', 'MESTRADO', 'DOUTORADO', 'POS_DOUTORADO');

-- CreateEnum
CREATE TYPE "Funcao" AS ENUM ('COORDENADOR', 'PROFESSOR', 'TECNICO', 'BOLSISTA', 'EXTERNO');

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('CORRENTE', 'POUPANCA');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MASCULINO', 'FEMININO', 'OUTRO', 'NAO_INFORMADO');

-- CreateEnum
CREATE TYPE "SolicitationStatus" AS ENUM ('RASCUNHO', 'AGUARDANDO_DIRECAO', 'PENDENTE_CORRECAO', 'AGUARDANDO_FINANCEIRO', 'APROVADO_PARA_PAGAMENTO', 'PAGO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "TransportType" AS ENUM ('AEREO', 'TERRESTRE', 'FLUVIAL');

-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('OFICIAL', 'PROPRIO', 'ALUGADO', 'PUBLICO');

-- CreateEnum
CREATE TYPE "TravelType" AS ENUM ('NACIONAL', 'INTERNACIONAL');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('ABERTO', 'FECHADO', 'EM_CORRECAO', 'APROVADO', 'ARQUIVADO');

-- CreateEnum
CREATE TYPE "RefusalReason" AS ENUM ('DOCUMENTACAO_INCOMPLETA', 'DADOS_INCORRETOS', 'FALTA_DE_COMPROVANTES', 'OUTROS');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "roles" "Role"[] DEFAULT ARRAY['AGENTE']::"Role"[],
    "nomeSocial" TEXT,
    "cpf" TEXT,
    "rg" TEXT,
    "orgaoExpeditor" TEXT,
    "dataNascimento" TIMESTAMP(3),
    "genero" "Gender" DEFAULT 'NAO_INFORMADO',
    "mae" TEXT,
    "pai" TEXT,
    "telefone" TEXT,
    "celular" TEXT,
    "cep" TEXT,
    "endereco" TEXT,
    "bairro" TEXT,
    "cidade" TEXT,
    "estado" "State",
    "titulacao" "Titulacao",
    "funcao" "Funcao",
    "bankId" INTEGER,
    "agencia" TEXT,
    "conta" TEXT,
    "tipoConta" "AccountType",
    "xUsername" TEXT,
    "linkedinUsername" TEXT,
    "profileImage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bancos" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,

    CONSTRAINT "bancos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cursos" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,

    CONSTRAINT "cursos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solicitantes" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "courseId" INTEGER NOT NULL,

    CONSTRAINT "solicitantes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "objetivos_solicitacao" (
    "id" SERIAL NOT NULL,
    "objetivo" TEXT NOT NULL,

    CONSTRAINT "objetivos_solicitacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tipos_de_diaria" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "tipos_de_diaria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projetos" (
    "id" SERIAL NOT NULL,
    "nomeDoProjeto" TEXT NOT NULL,
    "numTed" TEXT NOT NULL,
    "dtInicial" TIMESTAMP(3) NOT NULL,
    "dtFinal" TIMESTAMP(3) NOT NULL,
    "contaCorrente" TEXT NOT NULL,
    "saldo" DECIMAL(14,2) NOT NULL DEFAULT 0,

    CONSTRAINT "projetos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "destinos" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,

    CONSTRAINT "destinos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solicitacoes" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "motivoSolicitacao" TEXT NOT NULL,
    "origem" TEXT NOT NULL,
    "destino" TEXT NOT NULL,
    "dataIda" TIMESTAMP(3) NOT NULL,
    "dataVolta" TIMESTAMP(3) NOT NULL,
    "status" "SolicitationStatus" NOT NULL DEFAULT 'RASCUNHO',
    "isTemporaria" BOOLEAN NOT NULL DEFAULT false,
    "requesterId" INTEGER NOT NULL,

    CONSTRAINT "solicitacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "detalhes_solicitacao" (
    "id" SERIAL NOT NULL,
    "solicitationId" INTEGER NOT NULL,
    "agentId" INTEGER NOT NULL,
    "projectId" INTEGER NOT NULL,
    "dailyRateTypeId" INTEGER NOT NULL,
    "objectiveId" INTEGER NOT NULL,
    "bilhete" TEXT,
    "meioTransporte" "TransportType",
    "tipoVeiculo" "VehicleType",
    "condutor" TEXT,
    "placaVeiculo" TEXT,
    "tipoViagem" "TravelType",
    "qtdDiarias" DECIMAL(4,1) NOT NULL,
    "autorizada" BOOLEAN DEFAULT false,
    "originId" INTEGER,
    "destinyId" INTEGER,

    CONSTRAINT "detalhes_solicitacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "relatorios_viagem" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "prazoLimite" TIMESTAMP(3) NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'ABERTO',
    "atividadesRealizadas" TEXT,
    "comprovanteUrl" TEXT,
    "detailId" INTEGER NOT NULL,

    CONSTRAINT "relatorios_viagem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historico_relatorios" (
    "id" SERIAL NOT NULL,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acao" TEXT NOT NULL,
    "motivoRecusa" "RefusalReason",
    "observacao" TEXT,
    "reportId" INTEGER NOT NULL,

    CONSTRAINT "historico_relatorios_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_cpf_key" ON "users"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "users_rg_key" ON "users"("rg");

-- CreateIndex
CREATE UNIQUE INDEX "users_telefone_key" ON "users"("telefone");

-- CreateIndex
CREATE UNIQUE INDEX "users_celular_key" ON "users"("celular");

-- CreateIndex
CREATE UNIQUE INDEX "bancos_nome_key" ON "bancos"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "cursos_nome_key" ON "cursos"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "solicitantes_userId_key" ON "solicitantes"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "objetivos_solicitacao_objetivo_key" ON "objetivos_solicitacao"("objetivo");

-- CreateIndex
CREATE UNIQUE INDEX "tipos_de_diaria_nome_key" ON "tipos_de_diaria"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "projetos_numTed_key" ON "projetos"("numTed");

-- CreateIndex
CREATE UNIQUE INDEX "destinos_nome_key" ON "destinos"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "relatorios_viagem_detailId_key" ON "relatorios_viagem"("detailId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_bankId_fkey" FOREIGN KEY ("bankId") REFERENCES "bancos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitantes" ADD CONSTRAINT "solicitantes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitantes" ADD CONSTRAINT "solicitantes_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "cursos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitacoes" ADD CONSTRAINT "solicitacoes_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalhes_solicitacao" ADD CONSTRAINT "detalhes_solicitacao_solicitationId_fkey" FOREIGN KEY ("solicitationId") REFERENCES "solicitacoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalhes_solicitacao" ADD CONSTRAINT "detalhes_solicitacao_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalhes_solicitacao" ADD CONSTRAINT "detalhes_solicitacao_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projetos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalhes_solicitacao" ADD CONSTRAINT "detalhes_solicitacao_dailyRateTypeId_fkey" FOREIGN KEY ("dailyRateTypeId") REFERENCES "tipos_de_diaria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalhes_solicitacao" ADD CONSTRAINT "detalhes_solicitacao_objectiveId_fkey" FOREIGN KEY ("objectiveId") REFERENCES "objetivos_solicitacao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalhes_solicitacao" ADD CONSTRAINT "detalhes_solicitacao_originId_fkey" FOREIGN KEY ("originId") REFERENCES "destinos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalhes_solicitacao" ADD CONSTRAINT "detalhes_solicitacao_destinyId_fkey" FOREIGN KEY ("destinyId") REFERENCES "destinos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relatorios_viagem" ADD CONSTRAINT "relatorios_viagem_detailId_fkey" FOREIGN KEY ("detailId") REFERENCES "detalhes_solicitacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historico_relatorios" ADD CONSTRAINT "historico_relatorios_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "relatorios_viagem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
