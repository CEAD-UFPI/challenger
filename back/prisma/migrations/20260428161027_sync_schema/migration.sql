-- AlterTable
ALTER TABLE "projetos" ADD COLUMN     "courseId" INTEGER;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "courseId" INTEGER,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'PENDENTE';

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "cursos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projetos" ADD CONSTRAINT "projetos_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "cursos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
