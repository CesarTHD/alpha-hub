-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'NPS';

-- CreateTable
CREATE TABLE "nps" (
    "id" TEXT NOT NULL,
    "franquia_id" TEXT NOT NULL,
    "cliente_id" TEXT,
    "nome_empresa" TEXT NOT NULL,
    "whatsapp" TEXT NOT NULL,
    "nps" INTEGER NOT NULL,
    "nps_comentario" TEXT,
    "csat_atendimento" INTEGER NOT NULL,
    "csat_resultado" INTEGER NOT NULL,
    "csat_entregas" INTEGER NOT NULL,
    "csat_comentario" TEXT,
    "cev_seguranca" INTEGER NOT NULL,
    "cev_valorizacao" INTEGER NOT NULL,
    "ces_facilidade" INTEGER NOT NULL,
    "ces_comentario" TEXT,
    "pergunta_final" TEXT,
    "vinculado_por" TEXT,
    "vinculado_em" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "nps_franquia_id_idx" ON "nps"("franquia_id");

-- CreateIndex
CREATE INDEX "nps_cliente_id_idx" ON "nps"("cliente_id");

-- AddForeignKey
ALTER TABLE "nps" ADD CONSTRAINT "nps_franquia_id_fkey" FOREIGN KEY ("franquia_id") REFERENCES "franquias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nps" ADD CONSTRAINT "nps_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nps" ADD CONSTRAINT "nps_vinculado_por_fkey" FOREIGN KEY ("vinculado_por") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
