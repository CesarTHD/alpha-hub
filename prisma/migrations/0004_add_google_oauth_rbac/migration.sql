-- AlterTable
ALTER TABLE "usuarios" DROP COLUMN "senha_hash",
ADD COLUMN     "franquia_id" TEXT;

-- CreateIndex
CREATE INDEX "usuarios_franquia_id_idx" ON "usuarios"("franquia_id");

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_franquia_id_fkey" FOREIGN KEY ("franquia_id") REFERENCES "franquias"("id") ON DELETE SET NULL ON UPDATE CASCADE;
