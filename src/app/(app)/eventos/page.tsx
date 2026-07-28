import Link from "next/link";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";
import { tipoEventoLabel, tipoEventoBadgeVariant } from "@/lib/evento-labels";
import type { Prisma } from "@/generated/prisma/client";
import { getCurrentUser } from "@/lib/current-user";
import { eventoFranquiaScopeWhere } from "@/lib/rbac";

const TIPOS_EVENTO = Object.keys(tipoEventoLabel);

export const dynamic = "force-dynamic";

export default async function EventosPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string; cliente?: string }>;
}) {
  const { tipo, cliente } = await searchParams;
  const usuario = await getCurrentUser();

  const filtros: Prisma.EventoWhereInput[] = [eventoFranquiaScopeWhere(usuario)];
  if (tipo) filtros.push({ tipoEvento: tipo as Prisma.EventoWhereInput["tipoEvento"] });
  if (cliente) filtros.push({ cliente: { nome: { contains: cliente, mode: "insensitive" } } });
  const where: Prisma.EventoWhereInput = { AND: filtros };

  const eventos = await db.evento.findMany({
    where,
    orderBy: { dataEvento: "desc" },
    take: 200,
    include: { cliente: true, contrato: { select: { plano: true } }, usuarioResponsavel: true },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Eventos" description="Log completo e auditável do ciclo de vida dos clientes." />

      <Card>
        <CardContent className="pt-6">
          <form className="flex flex-wrap items-end gap-3">
            <div className="space-y-1 space-x-2">
              <label className="text-xs text-muted-foreground">Cliente</label>
              <Input name="cliente" defaultValue={cliente} placeholder="Buscar por nome..." className="w-56" />
            </div>
            <div className="space-y-1 space-x-2">
              <label className="text-xs text-muted-foreground">Tipo de evento</label>
              <select
                name="tipo"
                defaultValue={tipo ?? ""}
                className="h-9 w-56 rounded-md border border-input bg-transparent px-3 text-sm"
              >
                <option value="">Todos</option>
                {TIPOS_EVENTO.map((t) => (
                  <option key={t} value={t}>
                    {tipoEventoLabel[t]}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" variant="secondary">
              Filtrar
            </Button>
          </form>
        </CardContent>
      </Card>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Detalhes</TableHead>
            <TableHead>Responsável</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {eventos.map((e) => (
            <TableRow key={e.id}>
              <TableCell className="whitespace-nowrap">{formatDateTime(e.dataEvento)}</TableCell>
              <TableCell>
                <Link href={`/clientes/${e.clienteId}`} className="hover:underline">
                  {e.cliente.nome}
                </Link>
              </TableCell>
              <TableCell>
                <Badge variant={tipoEventoBadgeVariant[e.tipoEvento] ?? "secondary"}>
                  {tipoEventoLabel[e.tipoEvento] ?? e.tipoEvento}
                </Badge>
              </TableCell>
              <TableCell className="max-w-md truncate text-sm text-muted-foreground">
                {e.motivo ?? e.observacao ?? "—"}
              </TableCell>
              <TableCell>{e.usuarioResponsavel.nome}</TableCell>
            </TableRow>
          ))}
          {eventos.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                Nenhum evento encontrado.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
