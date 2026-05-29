-- Migration: Adiciona colunas e FKs ausentes que existem no schema.prisma
-- mas não foram criadas na migration inicial (init_regras_v2)

-- 1. Coluna users.status (usada para controle PENDENTE/ATIVO/BLOQUEADO)
ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'PENDENTE';

-- 2. Coluna users.courseId (vínculo do usuário com curso/departamento)
ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "courseId" INTEGER;

-- 3. Coluna projetos.courseId (vínculo do projeto com curso/departamento)
ALTER TABLE "projetos"
ADD COLUMN IF NOT EXISTS "courseId" INTEGER;

-- 4. FK: users.courseId -> cursos.id (idempotente)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'users_courseId_fkey'
    ) THEN
        ALTER TABLE "users"
        ADD CONSTRAINT "users_courseId_fkey"
        FOREIGN KEY ("courseId") REFERENCES "cursos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- 5. FK: projetos.courseId -> cursos.id (idempotente)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'projetos_courseId_fkey'
    ) THEN
        ALTER TABLE "projetos"
        ADD CONSTRAINT "projetos_courseId_fkey"
        FOREIGN KEY ("courseId") REFERENCES "cursos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
