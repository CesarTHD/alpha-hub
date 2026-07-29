import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";
import { statusContratoLabel } from "@/lib/evento-labels";
import { EditarClienteDialog } from "@/components/clientes/editar-cliente-dialog";
import { TransferirFranquiaDialog } from "@/components/clientes/transferir-franquia-dialog";
import { RenovacaoDialog } from "@/components/clientes/renovacao-dialog";
import { ChurnDialog } from "@/components/clientes/churn-dialog";
import { PausaButton, RetomadaButton } from "@/components/clientes/pausa-retomada-buttons";
import { AlterarPlanoDialog } from "@/components/clientes/alterar-plano-dialog";
import { AlterarValorDialog } from "@/components/clientes/alterar-valor-dialog";
import { ObservacaoDialog } from "@/components/clientes/observacao-dialog";
import { EventosTimeline } from "@/components/eventos/eventos-timeline";
import { getCurrentUser } from "@/lib/current-user";
import {
  canEditCliente,
  canManageContratos,
  canRegisterEvento,
  canTransferirFranquia,
  clienteFranquiaScopeWhere,
} from "@/lib/rbac";
import { encerrarContratosVencidos } from "@/lib/contrato-lifecycle";

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  ATIVO: "default",
  PAUSADO: "outline",
  ENCERRADO: "secondary",
  CHURN: "destructive",
};

export const dynamic = "force-dynamic";

export default async function ClienteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const usuario = await getCurrentUser();
  await encerrarContratosVencidos();

  const cliente = await db.cliente.findFirst({
    where: { id, deletedAt: null, ...clienteFranquiaScopeWhere(usuario) },
    include: {
      carteiraHistorico: {
        orderBy: { dataInicio: "desc" },
        include: { franquia: { include: { historicoProfit: { where: { ativo: true }, include: { profit: true } } } } },
      },
      contratos: { orderBy: { inicioContrato: "desc" } },
      eventos: {
        orderBy: { dataEvento: "desc" },
        include: { usuarioResponsavel: true, contrato: { select: { plano: true } } },
      },
    },
  });

  if (!cliente) notFound();

  const franquias = await db.franquia.findMany({ where: { deletedAt: null, ativo: true }, orderBy: { nome: "asc" } });

  const carteiraAtual = cliente.carteiraHistorico.find((c) => c.ativo);
  const ultimaCarteira = carteiraAtual ?? cliente.carteiraHistorico[0];
  // Inclui ENCERRADO para que o cliente ainda possa renovar após o prazo do
  // contrato vencer sem renovação (ver encerrarContratosVencidos).
  const contratoAtual = cliente.contratos.find(
    (c) => c.status === "ATIVO" || c.status === "PAUSADO" || c.status === "ENCERRADO",
  );
  const profitAtual = ultimaCarteira?.franquia.historicoProfit[0]?.profit;

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
          <Link href="/clientes">
            <ArrowLeft className="mr-1 h-4 w-4" /> Clientes
          </Link>
        </Button>
        <PageHeader
          title={cliente.nome}
          description={cliente.documento}
          actions={
            canRegisterEvento(usuario) ? (
              <ObservacaoDialog clienteId={cliente.id} contratoId={contratoAtual?.id} />
            ) : undefined
          }
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Dados cadastrais</CardTitle>
            {canEditCliente(usuario) && (
              <EditarClienteDialog
                cliente={{
                  id: cliente.id,
                  nome: cliente.nome,
                  documento: cliente.documento,
                  email: cliente.email,
                  telefone: cliente.telefone,
                  cidade: cliente.cidade,
                  estado: cliente.estado,
                  segmento: cliente.segmento,
                  observacoes: cliente.observacoes,
                }}
              />
            )}
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>
              <span className="text-muted-foreground">E-mail:</span> {cliente.email ?? "—"}
            </p>
            <p>
              <span className="text-muted-foreground">Telefone:</span> {cliente.telefone ?? "—"}
            </p>
            <p>
              <span className="text-muted-foreground">Cidade/Estado:</span>{" "}
              {cliente.cidade || cliente.estado
                ? `${cliente.cidade ?? "—"}/${cliente.estado ?? "—"}`
                : "—"}
            </p>
            <p>
              <span className="text-muted-foreground">Segmento:</span> {cliente.segmento ?? "—"}
            </p>
            {cliente.observacoes && (
              <p>
                <span className="text-muted-foreground">Observações:</span> {cliente.observacoes}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Franquia atual</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {ultimaCarteira ? (
              <>
                <p className="text-base font-medium">
                  {ultimaCarteira.franquia.nome} ({ultimaCarteira.franquia.cidade}/{ultimaCarteira.franquia.estado})
                  {!carteiraAtual && (
                    <span className="ml-2 text-xs font-normal text-muted-foreground">(encerrado)</span>
                  )}
                </p>
                <p className="text-muted-foreground">
                  Profit responsável: {profitAtual?.nome ?? "sem responsável"}
                </p>
                <p className="text-muted-foreground">
                  {carteiraAtual ? "Desde" : "De"} {formatDate(ultimaCarteira.dataInicio)}
                  {!carteiraAtual && ultimaCarteira.dataFim && <> até {formatDate(ultimaCarteira.dataFim)}</>}
                </p>
              </>
            ) : (
              <p className="text-muted-foreground">Cliente nunca teve franquia vinculada.</p>
            )}
            {canTransferirFranquia(usuario) && (
              <TransferirFranquiaDialog
                clienteId={cliente.id}
                franquiaAtualId={carteiraAtual?.franquiaId}
                franquias={franquias}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contrato atual</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {contratoAtual ? (
              <>
                <div className="flex items-center gap-2">
                  <p className="text-base font-medium">{contratoAtual.plano}</p>
                  <Badge variant={statusVariant[contratoAtual.status]}>
                    {statusContratoLabel[contratoAtual.status]}
                  </Badge>
                </div>
                <p className="text-muted-foreground">
                  {formatCurrency(contratoAtual.valorMensal.toString())}/mês · {contratoAtual.tipoContrato}
                </p>
                <p className="text-muted-foreground">Início em {formatDate(contratoAtual.inicioContrato)}</p>

                {canManageContratos(usuario) && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    <RenovacaoDialog
                      clienteId={cliente.id}
                      contrato={{
                        id: contratoAtual.id,
                        plano: contratoAtual.plano,
                        tipoContrato: contratoAtual.tipoContrato,
                        valorContrato: contratoAtual.valorContrato.toString(),
                        valorMensal: contratoAtual.valorMensal.toString(),
                        renovacaoAutomatica: contratoAtual.renovacaoAutomatica,
                      }}
                    />
                    {contratoAtual.status === "ATIVO" && (
                      <PausaButton clienteId={cliente.id} contratoId={contratoAtual.id} />
                    )}
                    {contratoAtual.status === "PAUSADO" && (
                      <RetomadaButton clienteId={cliente.id} contratoId={contratoAtual.id} />
                    )}
                    {contratoAtual.status !== "ENCERRADO" && (
                      <>
                        <AlterarPlanoDialog
                          clienteId={cliente.id}
                          contratoId={contratoAtual.id}
                          planoAtual={contratoAtual.plano}
                        />
                        <AlterarValorDialog
                          clienteId={cliente.id}
                          contratoId={contratoAtual.id}
                          valorAtual={contratoAtual.valorMensal.toString()}
                        />
                        <ChurnDialog clienteId={cliente.id} contratoId={contratoAtual.id} />
                      </>
                    )}
                  </div>
                )}
              </>
            ) : (
              <p className="text-muted-foreground">Sem contrato ativo.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Histórico de carteira</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Franquia</TableHead>
                  <TableHead>Início</TableHead>
                  <TableHead>Fim</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cliente.carteiraHistorico.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>{c.franquia.nome}</TableCell>
                    <TableCell>{formatDate(c.dataInicio)}</TableCell>
                    <TableCell>{c.ativo ? "atual" : formatDate(c.dataFim)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Histórico de contratos</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plano</TableHead>
                  <TableHead>Valor mensal</TableHead>
                  <TableHead>Vigência</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cliente.contratos.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>{c.plano}</TableCell>
                    <TableCell>{formatCurrency(c.valorMensal.toString())}</TableCell>
                    <TableCell>
                      {formatDate(c.inicioContrato)} – {formatDate(c.fimContrato)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[c.status]}>{statusContratoLabel[c.status]}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Linha do tempo de eventos</CardTitle>
        </CardHeader>
        <CardContent>
          <EventosTimeline eventos={cliente.eventos} />
        </CardContent>
      </Card>
    </div>
  );
}
