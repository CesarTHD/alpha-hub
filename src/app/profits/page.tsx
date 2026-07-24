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
import { ProfitFormDialog } from "@/components/profits/profit-form-dialog";
import { ProfitAtivoToggle } from "@/components/profits/profit-ativo-toggle";
import { ExcluirProfitButton } from "@/components/profits/excluir-profit-button";

export default async function ProfitsPage() {
  // No filtered `_count` on a nested relation here — see comment in
  // src/app/franquias/page.tsx for why (Prisma 7.9 + adapter-pg query-engine bug).
  const profits = await db.profit.findMany({ where: { deletedAt: null }, orderBy: { nome: "asc" } });
  const franquiasPorProfit = await db.franquiaProfitHistorico.groupBy({
    by: ["profitId"],
    where: { ativo: true },
    _count: { _all: true },
  });
  const franquiasPorProfitMap = new Map(franquiasPorProfit.map((g) => [g.profitId, g._count._all]));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profits"
        description="Responsáveis que gerenciam uma ou mais franquias."
        actions={<ProfitFormDialog />}
      />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>E-mail</TableHead>
            <TableHead>Telefone</TableHead>
            <TableHead>Franquias</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {profits.map((p) => (
            <TableRow key={p.id}>
              <TableCell className="font-medium">{p.nome}</TableCell>
              <TableCell>{p.email}</TableCell>
              <TableCell>{p.telefone ?? "—"}</TableCell>
              <TableCell>{franquiasPorProfitMap.get(p.id) ?? 0}</TableCell>
              <TableCell>
                <Badge variant={p.ativo ? "default" : "secondary"}>
                  {p.ativo ? "Ativo" : "Inativo"}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex justify-end gap-1">
                  <ProfitFormDialog profit={p} />
                  <ProfitAtivoToggle id={p.id} ativo={p.ativo} />
                  <ExcluirProfitButton id={p.id} nome={p.nome} />
                </div>
              </TableCell>
            </TableRow>
          ))}
          {profits.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                Nenhum Profit cadastrado ainda.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
