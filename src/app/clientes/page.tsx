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

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ nome?: string; status?: string }>;
}) {
  const { nome, status } = await searchParams;

  const where: Prisma.ClienteWhereInput = { deletedAt: null };
  if (nome) where.nome = { contains: nome, mode: "insensitive" };

  const clientesEncontrados = await db.cliente.findMany({
    where,
    orderBy: { nome: "asc" },
    include: {
      carteiraHistorico: { where: { ativo: true }, include: { franquia: true } },
      contratos: { orderBy: { inicioContrato: "desc" }, take: 1 },
    },
  });

  // Filtra pelo status do contrato mais recente — o mesmo que a coluna "Status" exibe.
  const clientes = status
    ? clientesEncontrados.filter((c) => c.contratos[0]?.status === status)
    : clientesEncontrados;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clientes"
        description="Toda a carteira de clientes da Alpha."
        actions={
          <Button asChild>
            <Link href="/clientes/novo">
              <Plus className="mr-1 h-4 w-4" /> Novo cliente
            </Link>
          </Button>
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
              <select
                name="status"
                defaultValue={status ?? ""}
                className="h-9 w-56 rounded-md border border-input bg-transparent px-3 text-sm"
              >
                <option value="">Todos</option>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" variant="secondary">
              Filtrar
            </Button>
            {(nome || status) && (
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
            <TableHead>Plano</TableHead>
            <TableHead>Valor mensal</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clientes.map((c) => {
            const contrato = c.contratos[0];
            const franquia = c.carteiraHistorico[0]?.franquia;
            return (
              <TableRow key={c.id} className="cursor-pointer">
                <TableCell className="font-medium">
                  <Link href={`/clientes/${c.id}`} className="hover:underline">
                    {c.nome}
                  </Link>
                </TableCell>
                <TableCell>{franquia ? `${franquia.nome}` : <span className="text-muted-foreground">—</span>}</TableCell>
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
              <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                {nome || status ? "Nenhum cliente encontrado para esse filtro." : "Nenhum cliente cadastrado ainda."}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
