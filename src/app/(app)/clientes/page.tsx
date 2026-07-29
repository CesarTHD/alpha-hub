import Link from "next/link";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/format";
import { Plus } from "lucide-react";
import type { Prisma, StatusContrato } from "@/generated/prisma/client";
import { getCurrentUser } from "@/lib/current-user";
import { canCreateCliente, clienteFranquiaScopeWhere } from "@/lib/rbac";
import { MultiSelectFilter } from "@/components/filters/multi-select-filter";
import { encerrarContratosVencidos } from "@/lib/contrato-lifecycle";

export const dynamic = "force-dynamic";

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  ATIVO: "default",
  PAUSADO: "outline",
  ENCERRADO: "secondary",
  CHURN: "destructive",
};

const STATUS_OPTIONS: { value: StatusContrato; label: string }[] = [
  { value: "ATIVO", label: "Ativo" },
  { value: "PAUSADO", label: "Pausado" },
  { value: "ENCERRADO", label: "Encerrado" },
  { value: "CHURN", label: "Churn" },
];

function toArray(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{
    nome?: string;
    status?: string | string[];
    franquia?: string | string[];
    profit?: string | string[];
  }>;
}) {
  const { nome, status: statusParam, franquia: franquiaParam, profit: profitParam } = await searchParams;
  const status = toArray(statusParam);
  const franquia = toArray(franquiaParam);
  const profit = toArray(profitParam);
  const usuario = await getCurrentUser();
  await encerrarContratosVencidos();

  const franquias = await db.franquia.findMany({
    where: { deletedAt: null },
    orderBy: { nome: "asc" },
    select: { id: true, nome: true },
  });
  const FRANQUIA_OPTIONS = franquias.map((f) => ({ value: f.id, label: f.nome }));

  const profits = await db.profit.findMany({
    where: { deletedAt: null },
    orderBy: { nome: "asc" },
    select: { id: true, nome: true },
  });
  const PROFIT_OPTIONS = profits.map((p) => ({ value: p.id, label: p.nome }));

  const filtros: Prisma.ClienteWhereInput[] = [{ deletedAt: null }, clienteFranquiaScopeWhere(usuario)];
  if (nome) filtros.push({ nome: { contains: nome, mode: "insensitive" } });
  if (franquia.length > 0) {
    filtros.push({ carteiraHistorico: { some: { ativo: true, franquiaId: { in: franquia } } } });
  }
  if (profit.length > 0) {
    filtros.push({
      carteiraHistorico: {
        some: { ativo: true, franquia: { historicoProfit: { some: { ativo: true, profitId: { in: profit } } } } },
      },
    });
  }
  const where: Prisma.ClienteWhereInput = { AND: filtros };

  const clientesEncontrados = await db.cliente.findMany({
    where,
    orderBy: { nome: "asc" },
    include: {
      carteiraHistorico: {
        orderBy: { dataInicio: "desc" },
        take: 1,
        include: {
          franquia: { include: { historicoProfit: { where: { ativo: true }, include: { profit: true } } } },
        },
      },
      contratos: { orderBy: { inicioContrato: "desc" }, take: 1 },
    },
  });

  // Filtra pelo status do contrato mais recente — o mesmo que a coluna "Status" exibe.
  const clientes = status.length > 0
    ? clientesEncontrados.filter((c) => c.contratos[0] && status.includes(c.contratos[0].status))
    : clientesEncontrados;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clientes"
        description="Toda a carteira de clientes da Alpha."
        actions={
          canCreateCliente(usuario) ? (
            <Button asChild>
              <Link href="/clientes/novo">
                <Plus className="mr-1 h-4 w-4" /> Novo cliente
              </Link>
            </Button>
          ) : undefined
        }
      />

      <Card>
        <CardContent className="pt-6">
          <form className="flex flex-wrap items-end gap-3">
            <div className="space-y-1 space-x-2">
              <label className="text-xs text-muted-foreground">Nome</label>
              <Input name="nome" defaultValue={nome} placeholder="Buscar por nome..." className="w-56" />
            </div>
            <div className="space-y-1 space-x-2">
              <label className="text-xs text-muted-foreground">Status</label>
              <MultiSelectFilter
                name="status"
                options={STATUS_OPTIONS}
                defaultValues={status}
                placeholder="Todos"
              />
            </div>
            <div className="space-y-1 space-x-2">
              <label className="text-xs text-muted-foreground">Franquia</label>
              <MultiSelectFilter
                name="franquia"
                options={FRANQUIA_OPTIONS}
                defaultValues={franquia}
                placeholder="Todas"
              />
            </div>
            <div className="space-y-1 space-x-2">
              <label className="text-xs text-muted-foreground">Profit</label>
              <MultiSelectFilter
                name="profit"
                options={PROFIT_OPTIONS}
                defaultValues={profit}
                placeholder="Todos"
              />
            </div>
            <Button type="submit" variant="secondary">
              Filtrar
            </Button>
            {(nome || status.length > 0 || franquia.length > 0 || profit.length > 0) && (
              <Button asChild variant="ghost">
                <Link href="/clientes">Limpar</Link>
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        {clientes.length} {clientes.length === 1 ? "cliente encontrado" : "clientes encontrados"}
      </p>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Franquia</TableHead>
            <TableHead>Profit</TableHead>
            <TableHead>Plano</TableHead>
            <TableHead>Valor mensal</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clientes.map((c) => {
            const contrato = c.contratos[0];
            const carteira = c.carteiraHistorico[0];
            return (
              <TableRow key={c.id} className="cursor-pointer">
                <TableCell className="font-medium">
                  <Link href={`/clientes/${c.id}`} className="hover:underline">
                    {c.nome}
                  </Link>
                </TableCell>
                <TableCell>
                  {carteira ? (
                    <span className={carteira.ativo ? undefined : "text-muted-foreground"}>
                      {carteira.franquia.nome}
                      {!carteira.ativo && " (encerrado)"}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  {carteira?.franquia.historicoProfit[0]?.profit.nome ?? (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>{contrato?.plano ?? "—"}</TableCell>
                <TableCell>{contrato ? formatCurrency(contrato.valorMensal.toString()) : "—"}</TableCell>
                <TableCell>
                  {contrato ? (
                    <Badge variant={statusVariant[contrato.status]}>{contrato.status}</Badge>
                  ) : (
                    "—"
                  )}
                </TableCell>
              </TableRow>
            );
          })}
          {clientes.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                {nome || status.length > 0 || franquia.length > 0 || profit.length > 0
                  ? "Nenhum cliente encontrado para esse filtro."
                  : "Nenhum cliente cadastrado ainda."}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
