-- CreateEnum
CREATE TYPE "StatusPropostaD4Sign" AS ENUM ('PENDENTE', 'APLICADA', 'REJEITADA');

-- CreateTable
CREATE TABLE "propostas_d4sign" (
    "id" TEXT NOT NULL,
    "cliente_id" TEXT NOT NULL,
    "uuid_documento" TEXT NOT NULL,
    "nome_documento" TEXT NOT NULL,
    "confianca" TEXT NOT NULL,
    "status" "StatusPropostaD4Sign" NOT NULL DEFAULT 'PENDENTE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revisado_em" TIMESTAMP(3),
    "revisado_por" TEXT,

    CONSTRAINT "propostas_d4sign_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "propostas_d4sign_status_idx" ON "propostas_d4sign"("status");

-- CreateIndex
CREATE UNIQUE INDEX "propostas_d4sign_cliente_id_uuid_documento_key" ON "propostas_d4sign"("cliente_id", "uuid_documento");

-- AddForeignKey
ALTER TABLE "propostas_d4sign" ADD CONSTRAINT "propostas_d4sign_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "propostas_d4sign" ADD CONSTRAINT "propostas_d4sign_revisado_por_fkey" FOREIGN KEY ("revisado_por") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
