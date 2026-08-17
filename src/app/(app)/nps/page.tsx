import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { canAccessNpsScreen } from "@/lib/rbac";
import { calcularHealthScore } from "@/lib/nps/health-score";
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
import { Button } from "@/components/ui/button";
import { CopyLinkButton } from "@/components/nps/copy-link-button";

export const dynamic = "force-dynamic";

function healthScoreBadgeClass(score: number) {
  if (score <= 60) return "bg-rose-500/15 text-rose-600 dark:text-rose-400";
  if (score <= 80) return "bg-amber-500/15 text-amber-600 dark:text-amber-400";
  return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400";
}

export default async function NpsPage() {
  const usuario = await getCurrentUser();
  if (!canAccessNpsScreen(usuario)) redirect("/");

  // Sequencial de propósito — evita o bug de bind-parameter do Prisma 7.9 +
  // @prisma/adapter-pg sob consultas concorrentes (ver AGENTS.md).
  const franquias = await db.franquia.findMany({
    where: { deletedAt: null, ativo: true },
    orderBy: { nome: "asc" },
    select: { id: true, nome: true, cidade: true, estado: true },
  });

  const respostas = await db.npsResposta.findMany({
    select: {
      franquiaId: true,
      nps: true,
      csatAtendimento: true,
      csatResultado: true,
      csatEntregas: true,
      cevSeguranca: true,
      cevValorizacao: true,
      cesFacilidade: true,
    },
  });

  const respostasPorFranquia = new Map<string, typeof respostas>();
  for (const r of respostas) {
    const lista = respostasPorFranquia.get(r.franquiaId) ?? [];
    lista.push(r);
    respostasPorFranquia.set(r.franquiaId, lista);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="NPS"
        description="Gere o link de formulário de cada franquia e acompanhe o HealthScore com base nas respostas recebidas."
      />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Franquia</TableHead>
            <TableHead>Cidade/UF</TableHead>
            <TableHead>Respostas</TableHead>
            <TableHead>HealthScore</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {franquias.map((f) => {
            const respostasFranquia = respostasPorFranquia.get(f.id) ?? [];
            const score = calcularHealthScore(respostasFranquia);
            return (
              <TableRow key={f.id}>
                <TableCell className="font-medium">{f.nome}</TableCell>
                <TableCell>
                  {f.cidade}/{f.estado}
                </TableCell>
                <TableCell>{respostasFranquia.length}</TableCell>
                <TableCell>
                  {score === null ? (
                    <span className="text-muted-foreground">Sem respostas</span>
                  ) : (
                    <Badge className={healthScoreBadgeClass(score)} variant="secondary">
                      {score}
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    <CopyLinkButton path={`/nps/${f.id}`} />
                    <Button asChild variant="secondary" size="sm">
                      <Link href={`/nps/respostas/${f.id}`}>Ver respostas</Link>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
          {franquias.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                Nenhuma franquia ativa cadastrada ainda.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
