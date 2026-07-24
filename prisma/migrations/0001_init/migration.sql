-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'CEO', 'DIRETOR', 'PROFIT', 'FRANQUEADO', 'OPERACIONAL');

-- CreateEnum
CREATE TYPE "TipoContrato" AS ENUM ('MENSAL', 'TRIMESTRAL', 'SEMESTRAL', 'ANUAL');

-- CreateEnum
CREATE TYPE "StatusContrato" AS ENUM ('ATIVO', 'PAUSADO', 'ENCERRADO', 'CHURN');

-- CreateEnum
CREATE TYPE "TipoEvento" AS ENUM ('CRIACAO_CLIENTE', 'NOVO_CONTRATO', 'RENOVACAO', 'PAUSA', 'RETOMADA', 'CHURN', 'ALTERACAO_PLANO', 'ALTERACAO_VALOR', 'TRANSFERENCIA_FRANQUIA', 'ALTERACAO_PROFIT', 'OBSERVACAO');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profits" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telefone" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "franquias" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cidade" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "franquias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "franquia_profit_historico" (
    "id" TEXT NOT NULL,
    "franquia_id" TEXT NOT NULL,
    "profit_id" TEXT NOT NULL,
    "data_inicio" TIMESTAMP(3) NOT NULL,
    "data_fim" TIMESTAMP(3),
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "franquia_profit_historico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clientes" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "documento" TEXT NOT NULL,
    "email" TEXT,
    "telefone" TEXT,
    "segmento" TEXT,
    "observacoes" TEXT,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cliente_carteira" (
    "id" TEXT NOT NULL,
    "cliente_id" TEXT NOT NULL,
    "franquia_id" TEXT NOT NULL,
    "data_inicio" TIMESTAMP(3) NOT NULL,
    "data_fim" TIMESTAMP(3),
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cliente_carteira_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contratos" (
    "id" TEXT NOT NULL,
    "cliente_id" TEXT NOT NULL,
    "plano" TEXT NOT NULL,
    "tipo_contrato" "TipoContrato" NOT NULL,
    "valor_contrato" DECIMAL(14,2) NOT NULL,
    "valor_mensal" DECIMAL(14,2) NOT NULL,
    "inicio_contrato" TIMESTAMP(3) NOT NULL,
    "fim_contrato" TIMESTAMP(3),
    "renovacao_automatica" BOOLEAN NOT NULL DEFAULT false,
    "status" "StatusContrato" NOT NULL DEFAULT 'ATIVO',
    "data_saida" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contratos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eventos" (
    "id" TEXT NOT NULL,
    "cliente_id" TEXT NOT NULL,
    "contrato_id" TEXT,
    "tipo_evento" "TipoEvento" NOT NULL,
    "data_evento" TIMESTAMP(3) NOT NULL,
    "motivo" TEXT,
    "observacao" TEXT,
    "usuario_responsavel" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eventos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auditoria" (
    "id" TEXT NOT NULL,
    "tabela" TEXT NOT NULL,
    "registro_id" TEXT NOT NULL,
    "campo" TEXT NOT NULL,
    "valor_anterior" TEXT,
    "valor_novo" TEXT,
    "usuario_id" TEXT,
    "data_alteracao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "legado_importacoes" (
    "id" TEXT NOT NULL,
    "origem_id" TEXT NOT NULL,
    "tabela_destino" TEXT NOT NULL,
    "registro_id" TEXT NOT NULL,
    "lote_importacao" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "legado_importacoes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "profits_email_key" ON "profits"("email");

-- CreateIndex
CREATE INDEX "franquia_profit_historico_franquia_id_ativo_idx" ON "franquia_profit_historico"("franquia_id", "ativo");

-- CreateIndex
CREATE INDEX "franquia_profit_historico_profit_id_idx" ON "franquia_profit_historico"("profit_id");

-- CreateIndex
CREATE UNIQUE INDEX "clientes_documento_key" ON "clientes"("documento");

-- CreateIndex
CREATE INDEX "cliente_carteira_cliente_id_ativo_idx" ON "cliente_carteira"("cliente_id", "ativo");

-- CreateIndex
CREATE INDEX "cliente_carteira_franquia_id_idx" ON "cliente_carteira"("franquia_id");

-- CreateIndex
CREATE INDEX "contratos_cliente_id_idx" ON "contratos"("cliente_id");

-- CreateIndex
CREATE INDEX "contratos_status_idx" ON "contratos"("status");

-- CreateIndex
CREATE INDEX "eventos_cliente_id_data_evento_idx" ON "eventos"("cliente_id", "data_evento");

-- CreateIndex
CREATE INDEX "eventos_tipo_evento_idx" ON "eventos"("tipo_evento");

-- CreateIndex
CREATE INDEX "eventos_data_evento_idx" ON "eventos"("data_evento");

-- CreateIndex
CREATE INDEX "auditoria_tabela_registro_id_idx" ON "auditoria"("tabela", "registro_id");

-- CreateIndex
CREATE INDEX "legado_importacoes_lote_importacao_idx" ON "legado_importacoes"("lote_importacao");

-- CreateIndex
CREATE UNIQUE INDEX "legado_importacoes_origem_id_tabela_destino_key" ON "legado_importacoes"("origem_id", "tabela_destino");

-- AddForeignKey
ALTER TABLE "franquia_profit_historico" ADD CONSTRAINT "franquia_profit_historico_franquia_id_fkey" FOREIGN KEY ("franquia_id") REFERENCES "franquias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "franquia_profit_historico" ADD CONSTRAINT "franquia_profit_historico_profit_id_fkey" FOREIGN KEY ("profit_id") REFERENCES "profits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cliente_carteira" ADD CONSTRAINT "cliente_carteira_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cliente_carteira" ADD CONSTRAINT "cliente_carteira_franquia_id_fkey" FOREIGN KEY ("franquia_id") REFERENCES "franquias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contratos" ADD CONSTRAINT "contratos_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventos" ADD CONSTRAINT "eventos_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventos" ADD CONSTRAINT "eventos_contrato_id_fkey" FOREIGN KEY ("contrato_id") REFERENCES "contratos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventos" ADD CONSTRAINT "eventos_usuario_responsavel_fkey" FOREIGN KEY ("usuario_responsavel") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditoria" ADD CONSTRAINT "auditoria_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

