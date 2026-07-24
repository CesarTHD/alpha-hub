# Plano de Migração de Dados Legados

Status: **planejamento** — ainda não há arquivo/planilha legada disponível. Este documento e o
script em `scripts/import-legado.ts` definem a estrutura para quando os dados chegarem; nenhuma
lógica de parsing real foi implementada ainda.

## Origem esperada

Planilha/export consolidado com uma linha por contrato, contendo (conforme especificação):

`ID, Cliente, Franquia, Status, Plano, Tipo Contrato, Valor Contrato, Valor Mensal, Início Contrato,
Fim Contrato, Renovação Auto, Vencimento, Alerta, Data de Saída, Cliente Ativo, Cliente Churn,
Cliente Pausado, Ano, Mês, Nome Mês, AnoMês, Meses Contrato, Faixa Vencimento, Profit`

## Mapeamento para o schema

| Coluna legada | Destino |
|---|---|
| `ID` | chave de origem em `legado_importacoes.origem_id` (nunca vira PK real) |
| `Cliente` | `clientes.nome` (novo `Cliente` se não existir um com o mesmo documento/nome normalizado) |
| `Franquia` | `franquias.nome` (upsert) + um registro em `cliente_carteira` |
| `Profit` | `profits.nome` (upsert) + um registro em `franquia_profit_historico` ligando à franquia da linha |
| `Plano`, `Tipo Contrato`, `Valor Contrato`, `Valor Mensal`, `Início Contrato`, `Fim Contrato`, `Renovação Auto` | campos diretos de `contratos` |
| `Status`, `Cliente Ativo`, `Cliente Churn`, `Cliente Pausado`, `Data de Saída` | derivam `contratos.status` e `contratos.data_saida` |
| `Ano`, `Mês`, `Nome Mês`, `AnoMês`, `Meses Contrato`, `Faixa Vencimento`, `Vencimento`, `Alerta` | campos derivados/de relatório — **não** persistidos como colunas; são recalculáveis a partir de `inicio_contrato`/`fim_contrato` (evitar duplicar fonte de verdade) |

Cada linha importada também gera um evento inicial (`CRIACAO_CLIENTE` e/ou `NOVO_CONTRATO`) com
`data_evento` = `inicio_contrato` e `observacao` indicando que a origem é a migração de dados legados.

## Evitar duplicidade

- **Cliente**: chave de dedup é `documento` (CNPJ/CPF) quando disponível na planilha; se a planilha
  legada não tiver documento, ele precisa ser adicionado como coluna antes de importar (ou o dedup
  será por nome normalizado + primeira franquia, o que é frágil e deve ser revisado manualmente).
- **Franquia** e **Profit**: dedup por nome normalizado (trim + case-insensitive), upsert.
- **Idempotência/reprocessamento**: a tabela `legado_importacoes` guarda `(origem_id, tabela_destino) -> registro_id`
  para cada linha processada. Reprocessar o mesmo arquivo faz *upsert* (atualiza o registro já criado)
  em vez de duplicar. `lote_importacao` identifica cada execução, para auditoria de quando cada
  registro entrou.

## Passo a passo de execução (quando o arquivo chegar)

1. Colocar o arquivo (Excel/CSV) em `scripts/data/legado.xlsx` (não versionar — adicionar ao `.gitignore`).
2. Rodar em modo *dry-run* (`npm run import:legado -- --dry-run`) para revisar contagens e conflitos
   antes de gravar no banco.
3. Rodar a importação real (`npm run import:legado`).
4. Conferir os totais reportados contra os totais da planilha (nº de clientes, contratos, ativos, churn).
5. Reprocessamento seguro: rodar de novo o mesmo comando não duplica nada, graças à tabela
   `legado_importacoes`.

## Pendências antes da implementação real

- Confirmar se a planilha final terá `documento` (CNPJ/CPF) por cliente — essencial para dedup seguro.
- Confirmar o usuário responsável (`usuario_responsavel`) a ser usado nos eventos gerados pela
  importação (ex.: um usuário de sistema "Importação Legado").
- Confirmar regra de conversão de `Status` da planilha para o enum `StatusContrato`.
