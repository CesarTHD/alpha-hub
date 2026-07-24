<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# AlphaHUB - Comercial

Gestão de clientes, contratos e eventos da Alpha (franquias). Full PRD context lives only in
chat history from the session that built this — this file is the durable summary.

## Stack

Next.js 16 (App Router) · Prisma 7.9 + `@prisma/adapter-pg` (Postgres) · shadcn/ui (Radix base) ·
Server Actions (no separate REST API yet) · Zod validation · no client-side form library (native
`<form>` + a `useServerAction` hook, see below).

## Status

**Built**: full schema (`prisma/schema.prisma`), migrations, docker-compose for real Postgres,
`docs/ERD.md`, `docs/IMPORTACAO_LEGADO.md` (plan only, no legacy file yet). Screens: Dashboard,
Franquias, Profits, Clientes (list/novo/detalhe), Eventos log. All lifecycle actions wired: novo
contrato, renovação, pausa, retomada, churn, transferência de franquia, alteração de plano/valor,
troca de Profit responsável (fans out `ALTERACAO_PROFIT` eventos to affected clients), observação.

**Not built yet** (highest value first):
1. **Auth** (Better Auth/NextAuth) + role-based permissions — `src/lib/current-user.ts` is a stub
   that always returns/creates a single ADMIN user; every action is attributed to it. No login,
   no access control at all right now.
2. **Auditoria** — the `auditoria` table exists in the schema but nothing writes to it, no screen.
3. **REST API layer** — everything runs through Server Actions internally; the PRD asks for
   documented REST APIs for future CRM/Pipefy/D4Sign integration.
4. **D4Sign integration** (Fase 2: webhook, PDF parsing, "é renovação?" flow). Note: the sibling
   project `../contract-wise-aid - Copia` already has working PDF-extraction logic (cliente/plano/
   valor/vigência) worth porting instead of rewriting.
5. **Real legacy-data import** — only `scripts/import-legado.ts` (skeleton) + the plan doc exist.
6. **Excel export**, **point-in-time historical queries** ("quantos clientes ativos em março/2025?"
   — dashboard only shows the current snapshot), **deploy to a real VPS/EasyPanel**.

**Partially done**: Eventos has basic filters (tipo + nome); Clientes list has none. Contratos have
no dedicated global list (only inside cliente detail, which matches the PRD's flows). Cliente has
no soft-delete action yet (Franquia/Profit do). Loading states are minimal (shadcn `skeleton` is
installed but unused).

## Conventions worth following

- **Soft delete everywhere** except `eventos`/`auditoria`/history tables: set `deletedAt` +
  `ativo: false`, never hard-delete. List queries always filter `deletedAt: null`.
- **Every state-changing action writes an `Evento`** — this is the whole point of the system (see
  PRD in chat history: event-sourced history over current-status-only). Don't add a mutation
  without also deciding which `TipoEvento` it produces.
- **Forms**: don't use `useActionState` inside a Client Component that also needs to close a
  dialog or toast on success — the newer `react-hooks/set-state-in-effect`/`react-hooks/refs` lint
  rules forbid both the effect-based and ref-based patterns for that. Use `src/hooks/use-server-action.ts`
  instead (`useTransition` + calling the action directly from an `onSubmit` handler) — see any file
  in `src/components/clientes/*-dialog.tsx` for the pattern.
- **Optional text fields in Zod schemas** must use `optionalText()` from
  `src/lib/actions/zod-helpers.ts`, not `.optional().or(z.literal(""))` — `FormData.get()` returns
  `null` (not `undefined`) for a field that isn't in the DOM at all (conditionally-rendered hidden
  inputs, or hand-built FormData), and plain `.optional()` doesn't treat `null` as absent.

## Known gotcha (not an app bug)

Under machine-speed, zero-delay requests (only ever reproduced via automated Playwright testing,
never at realistic human clicking speed across many manual verification runs), `@prisma/adapter-pg`
7.9.0 against `prisma dev`'s local database occasionally throws a prepared-statement/bind mismatch
shortly after a `$transaction()` call. Root cause not fully isolated (tried: avoiding `Promise.all`,
avoiding filtered `_count` on relations — neither was the actual fix; pacing requests ~400ms apart
was the only thing that reliably prevented it). If you hit `bind message supplies N parameters, but
prepared statement "" requires 0` or a `P2039`/`P2023` error, it's this — not your query. Prefer the
real Postgres in `docker-compose.yml` over `prisma dev` for anything beyond casual local coding.

## Local dev

`npm run db:dev` (starts local Postgres via Prisma, prints connection strings for `.env`) →
`npm run db:migrate` → `npm run dev`. Seeded admin: `admin@alpha.com.br` (fake password hash —
replace once auth exists).
