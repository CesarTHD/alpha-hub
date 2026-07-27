import { db } from "@/lib/db";
import { PageHeader } from "@/components/layout/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FranquiaFormDialog } from "@/components/franquias/franquia-form-dialog";
import { TrocaProfitDialog } from "@/components/franquias/troca-profit-dialog";
import { FranquiaAtivaToggle } from "@/components/franquias/franquia-ativa-toggle";
import { ExcluirFranquiaButton } from "@/components/franquias/excluir-franquia-button";

export const dynamic = "force-dynamic";

export default async function FranquiasPage() {
  // Sequential on purpose, and no filtered `_count` on a nested relation:
  // both concurrent queries (Promise.all) and filtered relation counts have
  // been observed to trip a query-engine bug under Prisma 7.9 +
  // @prisma/adapter-pg against `prisma dev`'s local proxy (cross-contaminated
  // rows / bind-parameter mismatches). Plain sequential queries avoid it.
  const franquias = await db.franquia.findMany({
    where: { deletedAt: null },
    orderBy: { nome: "asc" },
    include: {
      historicoProfit: { where: { ativo: true }, include: { profit: true } },
    },
  });
  const clientesAtivosPorFranquia = await db.clienteCarteira.groupBy({
    by: ["franquiaId"],
    where: { ativo: true },
    _count: { _all: true },
  });
  const clientesAtivosMap = new Map(clientesAtivosPorFranquia.map((g) => [g.franquiaId, g._count._all]));
  const profits = await db.profit.findMany({ where: { deletedAt: null, ativo: true }, orderBy: { nome: "asc" } });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Franquias"
        description="Unidades da Alpha e o Profit responsável por cada uma."
        actions={<FranquiaFormDialog />}
      />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Cidade/UF</TableHead>
            <TableHead>Profit responsável</TableHead>
            <TableHead>Clientes ativos</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {franquias.map((f) => {
            const profitAtual = f.historicoProfit[0]?.profit;
            return (
              <TableRow key={f.id}>
                <TableCell className="font-medium">{f.nome}</TableCell>
                <TableCell>
                  {f.cidade}/{f.estado}
                </TableCell>
                <TableCell>
                  {profitAtual ? profitAtual.nome : <span className="text-muted-foreground">Sem responsável</span>}
                </TableCell>
                <TableCell>{clientesAtivosMap.get(f.id) ?? 0}</TableCell>
                <TableCell>
                  <Badge variant={f.ativo ? "default" : "secondary"}>
                    {f.ativo ? "Ativa" : "Inativa"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <TrocaProfitDialog
                      franquiaId={f.id}
                      franquiaNome={f.nome}
                      profitAtualId={profitAtual?.id}
                      profits={profits}
                    />
                    <FranquiaFormDialog franquia={f} />
                    <FranquiaAtivaToggle id={f.id} ativo={f.ativo} />
                    <ExcluirFranquiaButton id={f.id} nome={f.nome} />
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
          {franquias.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                Nenhuma franquia cadastrada ainda.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
