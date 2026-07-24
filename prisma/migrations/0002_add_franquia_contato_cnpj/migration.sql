-- AlterTable
ALTER TABLE "franquias" ADD COLUMN     "telefone" TEXT,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "cnpj" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "franquias_cnpj_key" ON "franquias"("cnpj");
