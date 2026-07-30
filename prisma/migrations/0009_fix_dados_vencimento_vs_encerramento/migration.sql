-- Corrige dados gravados pelo sweep automático antes desta mudança de regra:
-- ele marcava contratos vencidos como ENCERRADO, mas ENCERRADO agora é
-- reservado para ação manual de um Profit/Franquia/Admin. Todo evento
-- ENCERRAMENTO_CONTRATO existente até aqui veio exclusivamente do sweep
-- automático (a ação manual de encerramento ainda não existia), então é
-- seguro reclassificar todos eles.

-- 1. Reclassifica os eventos do sweep automático.
UPDATE "eventos"
SET "tipo_evento" = 'VENCIMENTO_CONTRATO'
WHERE "tipo_evento" = 'ENCERRAMENTO_CONTRATO';

-- 2. Reclassifica o status dos contratos que foram fechados por esses eventos.
UPDATE "contratos"
SET "status" = 'VENCIDO'
WHERE "status" = 'ENCERRADO'
  AND "id" IN (
    SELECT DISTINCT "contrato_id"
    FROM "eventos"
    WHERE "tipo_evento" = 'VENCIMENTO_CONTRATO'
      AND "contrato_id" IS NOT NULL
  );
