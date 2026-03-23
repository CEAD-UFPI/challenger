-- CreateEnum
CREATE TYPE "ExpenseNatureType" AS ENUM ('NOTA', 'RENDIMENTO');

-- AlterTable
ALTER TABLE "users" ADD COLUMN "podeRemanejarCredito" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "naturezas_despesa" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "codigo" TEXT NOT NULL,
    "tipo" "ExpenseNatureType" NOT NULL,

    CONSTRAINT "naturezas_despesa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "creditos_saldo" (
    "id" SERIAL NOT NULL,
    "dataCredito" TIMESTAMP(3) NOT NULL,
    "valor" DECIMAL(14,2) NOT NULL,
    "notaCredito" TEXT,
    "projectId" INTEGER NOT NULL,

    CONSTRAINT "creditos_saldo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "creditos_saldo_natureza" (
    "id" SERIAL NOT NULL,
    "saldoNatureza" DECIMAL(14,2) NOT NULL,
    "creditBalanceId" INTEGER NOT NULL,
    "expenseNatureId" INTEGER NOT NULL,

    CONSTRAINT "creditos_saldo_natureza_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "acoes_execucao" (
    "id" SERIAL NOT NULL,
    "descricao" TEXT NOT NULL,
    "valor" DECIMAL(14,2) NOT NULL,
    "projectId" INTEGER NOT NULL,
    "expenseNatureId" INTEGER NOT NULL,

    CONSTRAINT "acoes_execucao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "remanejamentos_credito" (
    "id" SERIAL NOT NULL,
    "valor" DECIMAL(14,2) NOT NULL,
    "observacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creditBalanceId" INTEGER NOT NULL,
    "sourceNatureId" INTEGER NOT NULL,
    "destNatureId" INTEGER NOT NULL,
    "userId" INTEGER,

    CONSTRAINT "remanejamentos_credito_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "naturezas_despesa_codigo_key" ON "naturezas_despesa"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "creditos_saldo_natureza_creditBalanceId_expenseNatureId_key" ON "creditos_saldo_natureza"("creditBalanceId", "expenseNatureId");

-- AddForeignKey
ALTER TABLE "creditos_saldo" ADD CONSTRAINT "creditos_saldo_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projetos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creditos_saldo_natureza" ADD CONSTRAINT "creditos_saldo_natureza_creditBalanceId_fkey" FOREIGN KEY ("creditBalanceId") REFERENCES "creditos_saldo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creditos_saldo_natureza" ADD CONSTRAINT "creditos_saldo_natureza_expenseNatureId_fkey" FOREIGN KEY ("expenseNatureId") REFERENCES "naturezas_despesa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acoes_execucao" ADD CONSTRAINT "acoes_execucao_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projetos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acoes_execucao" ADD CONSTRAINT "acoes_execucao_expenseNatureId_fkey" FOREIGN KEY ("expenseNatureId") REFERENCES "naturezas_despesa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "remanejamentos_credito" ADD CONSTRAINT "remanejamentos_credito_creditBalanceId_fkey" FOREIGN KEY ("creditBalanceId") REFERENCES "creditos_saldo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "remanejamentos_credito" ADD CONSTRAINT "remanejamentos_credito_sourceNatureId_fkey" FOREIGN KEY ("sourceNatureId") REFERENCES "naturezas_despesa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "remanejamentos_credito" ADD CONSTRAINT "remanejamentos_credito_destNatureId_fkey" FOREIGN KEY ("destNatureId") REFERENCES "naturezas_despesa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "remanejamentos_credito" ADD CONSTRAINT "remanejamentos_credito_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
