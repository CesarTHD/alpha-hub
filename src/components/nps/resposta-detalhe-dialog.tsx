"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export type RespostaDetalhe = {
  nomeEmpresa: string;
  whatsapp: string;
  createdAt: Date;
  nps: number;
  npsComentario: string | null;
  csatAtendimento: number;
  csatResultado: number;
  csatEntregas: number;
  csatComentario: string | null;
  cevSeguranca: number;
  cevValorizacao: number;
  cesFacilidade: number;
  cesComentario: string | null;
  perguntaFinal: string | null;
};

function Nota({ label, valor }: { label: string; valor: number }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{valor}/10</span>
    </div>
  );
}

function Comentario({ children }: { children: string }) {
  return <p className="mt-1 rounded-md bg-muted px-3 py-2 text-sm">{children}</p>;
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2 border-t pt-4 first:border-t-0 first:pt-0">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{titulo}</p>
      {children}
    </div>
  );
}

export function RespostaDetalheDialog({
  clienteNome,
  resposta,
}: {
  clienteNome: string;
  resposta: RespostaDetalhe;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" className="font-medium text-foreground hover:underline">
          {clienteNome}
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Respostas de {clienteNome}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {resposta.nomeEmpresa} · {resposta.whatsapp} ·{" "}
            {resposta.createdAt.toLocaleDateString("pt-BR")}
          </p>

          <Secao titulo="Recomendação (NPS)">
            <Nota label="Probabilidade de recomendar" valor={resposta.nps} />
            {resposta.npsComentario && <Comentario>{resposta.npsComentario}</Comentario>}
          </Secao>

          <Secao titulo="Satisfação (CSAT)">
            <Nota label="Atendimento" valor={resposta.csatAtendimento} />
            <Nota label="Resultados entregues" valor={resposta.csatResultado} />
            <Nota label="Entregas (relatórios, materiais)" valor={resposta.csatEntregas} />
            {resposta.csatComentario && <Comentario>{resposta.csatComentario}</Comentario>}
          </Secao>

          <Secao titulo="Valor emocional (CEV)">
            <Nota label="Segurança e tranquilidade" valor={resposta.cevSeguranca} />
            <Nota label="Valorização como cliente" valor={resposta.cevValorizacao} />
          </Secao>

          <Secao titulo="Esforço (CES)">
            <Nota label="Facilidade em resolver problemas" valor={resposta.cesFacilidade} />
            {resposta.cesComentario && <Comentario>{resposta.cesComentario}</Comentario>}
          </Secao>

          {resposta.perguntaFinal && (
            <Secao titulo="O que faria diferente">
              <Comentario>{resposta.perguntaFinal}</Comentario>
            </Secao>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
