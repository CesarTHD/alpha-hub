"use client";

import { useMemo, useState } from "react";
import { ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { brl } from "@/lib/dashboard-analytics/agregacoes/shared";
import type { DadoRow } from "@/lib/dashboard-analytics/agregacoes/dados";

type SortKey = "cliente" | "franquia" | "cidade" | "plano" | "status" | "tipoContrato" | "mrr" | "tcv" | "lifetimeMeses" | "inicio" | "vencimento";

const COLUNAS: Array<{ key: SortKey; label: string }> = [
  { key: "cliente", label: "Cliente" },
  { key: "franquia", label: "Franquia" },
  { key: "cidade", label: "Cidade" },
  { key: "plano", label: "Plano" },
  { key: "status", label: "Status" },
  { key: "tipoContrato", label: "Tipo" },
  { key: "mrr", label: "MRR" },
  { key: "tcv", label: "TCV" },
  { key: "lifetimeMeses", label: "Lifetime" },
  { key: "inicio", label: "Início" },
  { key: "vencimento", label: "Vencimento" },
];

const PAGE_SIZE = 25;

function acessor(r: DadoRow, key: SortKey): string | number {
  if (key === "inicio") return r.inicio.getTime();
  if (key === "vencimento") return r.vencimento?.getTime() ?? Number.POSITIVE_INFINITY;
  return r[key];
}

const dataStr = (d: Date | null) => (d ? d.toLocaleDateString("pt-BR") : "—");

export function DadosTable({ rows, onSelect }: { rows: DadoRow[]; onSelect: (r: DadoRow) => void }) {
  const [sortKey, setSortKey] = useState<SortKey>("cliente");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [pagina, setPagina] = useState(0);

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setSortDir("asc");
    }
    setPagina(0);
  };

  const ordenadas = useMemo(() => {
    return [...rows].sort((a, b) => {
      const va = acessor(a, sortKey);
      const vb = acessor(b, sortKey);
      const cmp = typeof va === "string" ? va.localeCompare(String(vb)) : Number(va) - Number(vb);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [rows, sortKey, sortDir]);

  const totalPaginas = Math.max(1, Math.ceil(ordenadas.length / PAGE_SIZE));
  const paginaAtual = Math.min(pagina, totalPaginas - 1);
  const visiveis = ordenadas.slice(paginaAtual * PAGE_SIZE, paginaAtual * PAGE_SIZE + PAGE_SIZE);

  return (
    <div className="space-y-2">
      <Table>
        <TableHeader>
          <TableRow>
            {COLUNAS.map((c) => (
              <TableHead key={c.key}>
                <button className="flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort(c.key)}>
                  {c.label}
                  <ArrowUpDown className="h-3 w-3 opacity-50" />
                </button>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {visiveis.map((r) => (
            <TableRow key={r.contratoId} className="cursor-pointer" onClick={() => onSelect(r)}>
              <TableCell className="font-medium">{r.cliente}</TableCell>
              <TableCell>{r.franquia}</TableCell>
              <TableCell>
                {r.cidade}/{r.uf}
              </TableCell>
              <TableCell>{r.plano}</TableCell>
              <TableCell>{r.status}</TableCell>
              <TableCell>{r.tipoContrato}</TableCell>
              <TableCell>{brl(r.mrr)}</TableCell>
              <TableCell>{brl(r.tcv)}</TableCell>
              <TableCell>{r.lifetimeMeses.toFixed(1)}m</TableCell>
              <TableCell>{dataStr(r.inicio)}</TableCell>
              <TableCell>{dataStr(r.vencimento)}</TableCell>
            </TableRow>
          ))}
          {visiveis.length === 0 && (
            <TableRow>
              <TableCell colSpan={COLUNAS.length} className="py-6 text-center text-muted-foreground">
                Nenhum registro encontrado.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Página {paginaAtual + 1} de {totalPaginas} — {ordenadas.length} registros
        </span>
        <div className="flex gap-1">
          <Button variant="outline" size="icon-sm" disabled={paginaAtual === 0} onClick={() => setPagina((p) => p - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon-sm" disabled={paginaAtual >= totalPaginas - 1} onClick={() => setPagina((p) => p + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
