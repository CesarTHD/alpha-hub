# Diagrama ERD — AlphaHUB Comercial

Gerado a partir de `prisma/schema.prisma`. Ver também `prisma/migrations/0001_init/migration.sql` para o DDL aplicado.

```mermaid
erDiagram
    USUARIO ||--o{ CLIENTE : "cria/atualiza"
    USUARIO ||--o{ EVENTO : "responsável por"
    USUARIO ||--o{ AUDITORIA : "realiza"

    PROFIT ||--o{ FRANQUIA_PROFIT_HISTORICO : "responde por"
    FRANQUIA ||--o{ FRANQUIA_PROFIT_HISTORICO : "histórico de responsável"

    FRANQUIA ||--o{ CLIENTE_CARTEIRA : "recebe clientes"
    CLIENTE ||--o{ CLIENTE_CARTEIRA : "histórico de carteira"

    CLIENTE ||--o{ CONTRATO : "possui"
    CLIENTE ||--o{ EVENTO : "gera"
    CONTRATO ||--o{ EVENTO : "gera"

    USUARIO {
        string id PK
        string nome
        string email UK
        string senha_hash
        enum role
        bool ativo
        datetime deleted_at
    }

    PROFIT {
        string id PK
        string nome
        string email UK
        string telefone
        bool ativo
    }

    FRANQUIA {
        string id PK
        string nome
        string cidade
        string estado
        bool ativo
    }

    FRANQUIA_PROFIT_HISTORICO {
        string id PK
        string franquia_id FK
        string profit_id FK
        datetime data_inicio
        datetime data_fim
        bool ativo
    }

    CLIENTE {
        string id PK
        string nome
        string documento UK
        string email
        string telefone
        string segmento
        string created_by FK
        string updated_by FK
    }

    CLIENTE_CARTEIRA {
        string id PK
        string cliente_id FK
        string franquia_id FK
        datetime data_inicio
        datetime data_fim
        bool ativo
    }

    CONTRATO {
        string id PK
        string cliente_id FK
        string plano
        enum tipo_contrato
        decimal valor_contrato
        decimal valor_mensal
        datetime inicio_contrato
        datetime fim_contrato
        bool renovacao_automatica
        enum status
        datetime data_saida
    }

    EVENTO {
        string id PK
        string cliente_id FK
        string contrato_id FK
        enum tipo_evento
        datetime data_evento
        string motivo
        string observacao
        string usuario_responsavel FK
    }

    AUDITORIA {
        string id PK
        string tabela
        string registro_id
        string campo
        string valor_anterior
        string valor_novo
        string usuario_id FK
        datetime data_alteracao
    }
```

## Decisões de modelagem

- **Cliente não guarda franquia atual.** A franquia corrente de um cliente é sempre `cliente_carteira` com `ativo = true` e `data_fim = null`. Trocar de franquia = encerrar o registro ativo (`data_fim`) + criar um novo.
- **Franquia não guarda Profit atual.** Mesmo padrão via `franquia_profit_historico`.
- **Contrato tem status próprio** (`ATIVO/PAUSADO/ENCERRADO/CHURN`) além dos eventos — o status é o estado atual "materializado"; o evento é o registro histórico e auditável de *por que* ele mudou.
- **Soft delete:** todas as tabelas de entidade (não as de histórico/evento/auditoria) têm `deleted_at`. Nenhum dado é removido fisicamente, conforme especificado.
- **IDs:** `cuid()` em vez de auto-increment, para IDs não sequenciais/não adivinháveis e seguros para geração distribuída (import em lote, múltiplos ambientes).
- **Money:** `Decimal(14,2)` para `valor_contrato`/`valor_mensal` — nunca `Float`, para evitar erro de arredondamento em somas de MRR.
