"use client";

import * as React from "react";
import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LabelList,
  LineChart,
  Line,
  ComposedChart,
} from "recharts";
import {
  AlertTriangle,
  ArrowUpDown,
  TrendingUp,
  Users,
  Building2,
  DollarSign,
  Check,
  Info,
  Download,
  Search,
} from "lucide-react";
import {
  type ContratoRow,
  TIPO_CONTRATO_LABEL,
  STATUS_CONTRATO_LABEL,
  MESES_TCV,
  fimEfetivoMs,
  vigenteNoInstante,
  diffMeses,
} from "@/lib/carteira-calculos";
import {
  STATUS,
  STATUS_COLORS,
  FAIXA_COLORS,
  FALLBACK,
  PRIMARY,
  withAlpha,
  chartTooltipStyle,
  chartTooltipLabelStyle,
  chartTooltipItemStyle,
  chartGridColor,
} from "@/lib/chart-colors";
import { DashboardMultiSelect } from "@/components/dashboard/dashboard-multi-select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip as Tooltip2,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const brlFull = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const ESTE_MES = "Este mês";
const FAIXA_ORDEM = ["Vencido", "Até 30 dias", "31 a 60 dias", "61 a 90 dias", "Mais de 90 dias", "Recorrente"];

function venceEsteMes(vencimentoDias: number | null): boolean {
  if (vencimentoDias === null) return false;
  const hoje = new Date();
  const venc = new Date(hoje);
  venc.setDate(venc.getDate() + vencimentoDias);
  return venc.getFullYear() === hoje.getFullYear() && venc.getMonth() === hoje.getMonth();
}

function matchFaixa(arr: string[], d: ContratoRow): boolean {
  if (arr.length === 0) return true;
  if (arr.includes(d.faixaVencimento)) return true;
  return arr.includes(ESTE_MES) && venceEsteMes(d.vencimentoDias);
}

type SortKey =
  | "cliente"
  | "franquia"
  | "profit"
  | "status"
  | "plano"
  | "tipoContrato"
  | "valorMensal"
  | "vencimentoDias"
  | "faixaVencimento";

function sortAccessor(row: ContratoRow, key: SortKey): string | number {
  switch (key) {
    case "status":
      return STATUS_CONTRATO_LABEL[row.status];
    case "tipoContrato":
      return TIPO_CONTRATO_LABEL[row.tipoContrato];
    case "valorMensal":
      return row.valorMensal;
    case "vencimentoDias":
      return row.vencimentoDias ?? Number.POSITIVE_INFINITY;
    default:
      return row[key];
  }
}

export function CarteiraDashboard({ rows }: { rows: ContratoRow[] }) {
  const [profitFilter, setProfitFilter] = useState<string[]>([]);
  const [franquiaFilter, setFranquiaFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [tipoFilter, setTipoFilter] = useState<string[]>([]);
  const [faixaFilter, setFaixaFilter] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [clienteSearch, setClienteSearch] = useState("");
  const [mesRef, setMesRef] = useState<string>("");
  // Lazy initializer — jeito sancionado pelo React de capturar um valor
  // impuro (Date.now) uma única vez, sem violar a regra de pureza do render.
  const [agora] = useState(() => Date.now());

  const opts = useMemo(() => {
    const uniq = (k: "profit" | "franquia") =>
      Array.from(new Set(rows.map((d) => d[k]).filter((v) => v && v !== "—"))).sort();
    return {
      profit: uniq("profit"),
      franquia: uniq("franquia"),
      status: Object.values(STATUS_CONTRATO_LABEL),
      tipo: Object.values(TIPO_CONTRATO_LABEL),
      faixa: [...FAIXA_ORDEM, ESTE_MES],
    };
  }, [rows]);

  const refBounds = useMemo(() => {
    if (!mesRef) return null;
    const [y, m] = mesRef.split("-").map(Number);
    if (!y || !m) return null;
    const start = Date.UTC(y, m - 1, 1, 0, 0, 0);
    const end = Date.UTC(y, m, 0, 23, 59, 59);
    return { start, end };
  }, [mesRef]);

  // Snapshot: 1 linha por cliente (o contrato mais recente) — é sobre esse
  // recorte que os filtros de dropdown, os gráficos "estado atual" e a
  // tabela de detalhamento operam, igual ao dashboard de referência (cuja
  // fonte já era 1 linha por cliente). O histórico completo (`rows`) só
  // entra depois, para reconstruir séries temporais e lifetime real.
  const snapshotRows = useMemo(() => {
    const porCliente = new Map<string, ContratoRow>();
    for (const r of rows) {
      const atual = porCliente.get(r.clienteId);
      if (!atual || r.inicioContrato > atual.inicioContrato) porCliente.set(r.clienteId, r);
    }
    return Array.from(porCliente.values());
  }, [rows]);

  const snapshotFiltrado = useMemo(() => {
    const match = (arr: string[], v: string) => arr.length === 0 || arr.includes(v);
    return snapshotRows.filter(
      (d) =>
        match(profitFilter, d.profit) &&
        match(franquiaFilter, d.franquia) &&
        match(statusFilter, STATUS_CONTRATO_LABEL[d.status]) &&
        match(tipoFilter, TIPO_CONTRATO_LABEL[d.tipoContrato]) &&
        matchFaixa(faixaFilter, d),
    );
  }, [snapshotRows, profitFilter, franquiaFilter, statusFilter, tipoFilter, faixaFilter]);

  const clienteIdsFiltrados = useMemo(
    () => new Set(snapshotFiltrado.map((d) => d.clienteId)),
    [snapshotFiltrado],
  );

  // Histórico completo (todos os contratos, inclusive renovações já
  // encerradas) dos clientes que passaram no filtro — usado só pelas séries
  // temporais e pelo lifetime, que precisam enxergar além do contrato atual.
  const historyFiltrado = useMemo(
    () => rows.filter((r) => clienteIdsFiltrados.has(r.clienteId)),
    [rows, clienteIdsFiltrados],
  );

  const totalClientes = snapshotFiltrado.length;
  const totalMRR = snapshotFiltrado.filter((d) => d.tipoContrato === "MENSAL").length;
  const totalTCV = snapshotFiltrado.filter((d) => d.tipoContrato !== "MENSAL").length;

  const refEndMs = refBounds ? refBounds.end : null;

  // Sem mês de referência: usa o status "ao vivo" de cada contrato (fonte da
  // verdade). Com mês de referência: recalcula ponto-no-tempo sobre TODO o
  // histórico do cliente (não só o contrato atual), pra achar o contrato
  // certo mesmo quando ele já foi substituído por uma renovação.
  const baseAtivosRows = useMemo(() => {
    if (refEndMs === null) return historyFiltrado.filter((d) => d.ativo);
    return historyFiltrado.filter((d) => vigenteNoInstante(d, refEndMs));
  }, [historyFiltrado, refEndMs]);

  const ativosIds = useMemo(() => new Set(baseAtivosRows.map((d) => d.clienteId)), [baseAtivosRows]);
  const ativosMRRIds = useMemo(
    () => new Set(baseAtivosRows.filter((d) => d.tipoContrato === "MENSAL").map((d) => d.clienteId)),
    [baseAtivosRows],
  );
  const ativosTCVIds = useMemo(
    () => new Set(baseAtivosRows.filter((d) => d.tipoContrato !== "MENSAL").map((d) => d.clienteId)),
    [baseAtivosRows],
  );

  const ativos = ativosIds.size;
  const ativosMRR = ativosMRRIds.size;
  const ativosTCV = ativosTCVIds.size;

  const churn = useMemo(() => {
    const rowsChurn = refBounds
      ? historyFiltrado.filter(
          (d) =>
            d.churn &&
            d.dataSaida &&
            d.dataSaida.getTime() >= refBounds.start &&
            d.dataSaida.getTime() <= refBounds.end,
        )
      : historyFiltrado.filter((d) => d.churn);
    return new Set(rowsChurn.map((d) => d.clienteId)).size;
  }, [historyFiltrado, refBounds]);

  const pausados = snapshotFiltrado.filter((d) => d.pausado).length;
  const franquias = new Set(snapshotFiltrado.map((d) => d.franquia)).size;

  const mrr = baseAtivosRows
    .filter((d) => d.tipoContrato === "MENSAL")
    .reduce((s, d) => s + d.valorMensal, 0);
  const valorContratoTCV = baseAtivosRows
    .filter((d) => d.tipoContrato !== "MENSAL")
    .reduce((s, d) => s + d.valorContrato, 0);
  const ticketMedio = ativosMRR > 0 ? mrr / ativosMRR : 0;
  const ticketMedioTCV = ativosTCV > 0 ? valorContratoTCV / ativosTCV : 0;

  const churnRate = totalClientes > 0 ? (churn / totalClientes) * 100 : 0;
  const vencendo30 = snapshotFiltrado.filter(
    (d) => d.ativo && d.vencimentoDias !== null && d.vencimentoDias >= 0 && d.vencimentoDias <= 30,
  ).length;
  const vencidos = snapshotFiltrado.filter((d) => d.ativo && d.faixaVencimento === "Vencido").length;

  const porStatus = useMemo(() => {
    const map = new Map<string, number>();
    snapshotFiltrado.forEach((d) => {
      const label = STATUS_CONTRATO_LABEL[d.status];
      map.set(label, (map.get(label) ?? 0) + 1);
    });
    return Object.values(STATUS_CONTRATO_LABEL)
      .map((name) => ({ name, value: map.get(name) ?? 0 }))
      .filter((s) => s.value > 0);
  }, [snapshotFiltrado]);

  // Valor mensal do contrato ativo no instante de referência, por cliente —
  // usado nos gráficos que somam MRR (garante que, com mês de referência
  // selecionado, o valor bata com o contrato realmente vigente naquele mês,
  // não com o contrato atual).
  const valorMensalAtivoPorCliente = useMemo(() => {
    const map = new Map<string, number>();
    baseAtivosRows.forEach((d) => {
      map.set(d.clienteId, (map.get(d.clienteId) ?? 0) + d.valorMensal);
    });
    return map;
  }, [baseAtivosRows]);

  const topFranquias = useMemo(() => {
    const map = new Map<string, { clientes: number; mrr: number }>();
    snapshotFiltrado.forEach((d) => {
      const cur = map.get(d.franquia) ?? { clientes: 0, mrr: 0 };
      cur.clientes += 1;
      if (ativosMRRIds.has(d.clienteId)) cur.mrr += valorMensalAtivoPorCliente.get(d.clienteId) ?? 0;
      map.set(d.franquia, cur);
    });
    return Array.from(map.entries())
      .map(([franquia, v]) => ({ franquia, ...v }))
      .sort((a, b) => b.mrr - a.mrr)
      .slice(0, 10);
  }, [snapshotFiltrado, ativosMRRIds, valorMensalAtivoPorCliente]);

  const porPlano = useMemo(() => {
    const map = new Map<string, { clientes: number; mrr: number }>();
    snapshotFiltrado.forEach((d) => {
      const cur = map.get(d.plano) ?? { clientes: 0, mrr: 0 };
      cur.clientes += 1;
      if (ativosIds.has(d.clienteId)) cur.mrr += valorMensalAtivoPorCliente.get(d.clienteId) ?? 0;
      map.set(d.plano, cur);
    });
    return Array.from(map.entries())
      .map(([plano, v]) => ({ plano, ...v }))
      .sort((a, b) => b.clientes - a.clientes);
  }, [snapshotFiltrado, ativosIds, valorMensalAtivoPorCliente]);

  const porTipo = useMemo(() => {
    const map = new Map<string, number>();
    snapshotFiltrado.forEach((d) => {
      const label = TIPO_CONTRATO_LABEL[d.tipoContrato];
      map.set(label, (map.get(label) ?? 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [snapshotFiltrado]);

  const porFaixa = useMemo(() => {
    const map = new Map<string, number>();
    snapshotFiltrado
      .filter((d) => ativosIds.has(d.clienteId))
      .forEach((d) => {
        map.set(d.faixaVencimento, (map.get(d.faixaVencimento) ?? 0) + 1);
      });
    return FAIXA_ORDEM.filter((k) => map.has(k)).map((name) => ({ name, value: map.get(name) ?? 0 }));
  }, [snapshotFiltrado, ativosIds]);

  const timeSeries = useMemo(() => {
    type Ponto = {
      key: string;
      label: string;
      clientesTotal: number;
      mrrTotal: number;
      recebidos: number;
      perdidos: number;
    };

    const monthEnd = (y: number, m: number) => new Date(Date.UTC(y, m + 1, 0, 23, 59, 59));
    const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

    if (historyFiltrado.length === 0) return [] as Ponto[];

    // Primeiro contrato de cada cliente — só ele conta como "recebido" (uma
    // renovação não é uma nova aquisição, mesmo abrindo um novo Contrato).
    const primeiroContratoPorCliente = new Map<string, string>();
    historyFiltrado.forEach((r) => {
      const atualId = primeiroContratoPorCliente.get(r.clienteId);
      if (!atualId) {
        primeiroContratoPorCliente.set(r.clienteId, r.contratoId);
        return;
      }
      const atual = historyFiltrado.find((x) => x.contratoId === atualId)!;
      if (r.inicioContrato < atual.inicioContrato) primeiroContratoPorCliente.set(r.clienteId, r.contratoId);
    });
    const primeiroContratoIds = new Set(primeiroContratoPorCliente.values());

    const minStart = new Date(Math.min(...historyFiltrado.map((d) => d.inicioContrato.getTime())));
    const maxEnd = historyFiltrado.reduce((max, d) => {
      const fimMs = fimEfetivoMs(d);
      return fimMs !== null ? Math.max(max, fimMs) : max;
    }, 0);

    const endBound = refBounds ? new Date(refBounds.end) : new Date(Math.max(agora, maxEnd));
    if (minStart.getTime() > endBound.getTime()) return [] as Ponto[];

    const pontos: Ponto[] = [];
    let y = minStart.getUTCFullYear();
    let m = minStart.getUTCMonth();

    while (y < endBound.getUTCFullYear() || (y === endBound.getUTCFullYear() && m <= endBound.getUTCMonth())) {
      const som = Date.UTC(y, m, 1);
      const eom = monthEnd(y, m).getTime();

      const ativosNoMes = new Set<string>();
      let mrrTotal = 0;
      let recebidos = 0;
      let perdidos = 0;

      historyFiltrado.forEach((r) => {
        const inicioMs = r.inicioContrato.getTime();
        const fimMs = fimEfetivoMs(r);
        const ativoNoFimDoMes = inicioMs <= eom && (fimMs === null || fimMs > eom);

        if (ativoNoFimDoMes) {
          ativosNoMes.add(r.clienteId);
          if (r.tipoContrato === "MENSAL") mrrTotal += r.valorMensal;
        }

        if (primeiroContratoIds.has(r.contratoId) && inicioMs >= som && inicioMs <= eom) {
          recebidos++;
        }

        if (r.churn && r.dataSaida && r.dataSaida.getTime() >= som && r.dataSaida.getTime() <= eom) {
          perdidos++;
        }
      });

      pontos.push({
        key: `${y}-${String(m + 1).padStart(2, "0")}`,
        label: `${meses[m]}/${String(y).slice(2)}`,
        clientesTotal: ativosNoMes.size,
        mrrTotal,
        recebidos,
        perdidos,
      });

      m++;
      if (m > 11) {
        m = 0;
        y++;
      }
    }

    return pontos.slice(-24);
  }, [historyFiltrado, refBounds, agora]);

  const contratosEmRisco = useMemo(
    () =>
      snapshotFiltrado
        .filter((d) => d.ativo && d.vencimentoDias !== null && d.vencimentoDias <= 30 && !d.renovacaoAutomatica)
        .sort((a, b) => (a.vencimentoDias ?? 0) - (b.vencimentoDias ?? 0)),
    [snapshotFiltrado],
  );

  const sortedRows = useMemo(() => {
    const linhas = [...snapshotFiltrado];
    if (sortKey === null) {
      linhas.sort((a, b) => {
        if (a.ativo !== b.ativo) return a.ativo ? -1 : 1;
        const av = a.vencimentoDias ?? Number.POSITIVE_INFINITY;
        const bv = b.vencimentoDias ?? Number.POSITIVE_INFINITY;
        if (av !== bv) return av - bv;
        return b.valorMensal - a.valorMensal;
      });
    } else {
      linhas.sort((a, b) => {
        const av = sortAccessor(a, sortKey);
        const bv = sortAccessor(b, sortKey);
        if (typeof av === "number" && typeof bv === "number") {
          return sortDir === "asc" ? av - bv : bv - av;
        }
        return sortDir === "asc"
          ? String(av).localeCompare(String(bv))
          : String(bv).localeCompare(String(av));
      });
    }
    return linhas;
  }, [snapshotFiltrado, sortKey, sortDir]);

  const toggleSort = (k: SortKey) => {
    if (k === sortKey) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortKey(k);
      setSortDir(k === "valorMensal" ? "desc" : "asc");
    }
  };

  const clearFilters = () => {
    setProfitFilter([]);
    setFranquiaFilter([]);
    setStatusFilter([]);
    setTipoFilter([]);
    setFaixaFilter([]);
    setMesRef("");
    setSortKey(null);
  };

  // Lifetime médio: agrupado por cliente (não por contrato) — um cliente
  // renovado 3x conta o tempo desde o PRIMEIRO contrato até hoje/churn, não
  // reinicia a contagem a cada renovação.
  const lifetimes = useMemo(() => {
    const refEnd = refBounds ? new Date(refBounds.end) : new Date(agora);
    const porCliente = new Map<string, ContratoRow[]>();
    historyFiltrado.forEach((r) => {
      const lista = porCliente.get(r.clienteId) ?? [];
      lista.push(r);
      porCliente.set(r.clienteId, lista);
    });

    const valoresLifetime: number[] = [];
    const valoresContratado: number[] = [];
    const valoresChurn: number[] = [];

    porCliente.forEach((linhasCliente) => {
      const ordenado = [...linhasCliente].sort((a, b) => a.inicioContrato.getTime() - b.inicioContrato.getTime());
      const relevantes = ordenado.filter((r) => r.inicioContrato.getTime() <= refEnd.getTime());
      if (relevantes.length === 0) return;
      const primeiro = ordenado[0];
      const ultimo = relevantes[relevantes.length - 1];

      if (ultimo.churn && ultimo.dataSaida && ultimo.dataSaida.getTime() <= refEnd.getTime()) {
        const meses = diffMeses(primeiro.inicioContrato, ultimo.dataSaida);
        valoresLifetime.push(meses);
        valoresContratado.push(meses);
        valoresChurn.push(meses);
        return;
      }

      valoresLifetime.push(diffMeses(primeiro.inicioContrato, refEnd));

      const tenureAntesDoUltimo = diffMeses(primeiro.inicioContrato, ultimo.inicioContrato);
      const mesesFixos = MESES_TCV[ultimo.tipoContrato];
      valoresContratado.push(
        mesesFixos !== undefined ? tenureAntesDoUltimo + mesesFixos : diffMeses(primeiro.inicioContrato, refEnd),
      );
    });

    const media = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
    return {
      lifetimeMedio: media(valoresLifetime),
      lifetimeMedioContratado: media(valoresContratado),
      lifetimeMedioChurn: media(valoresChurn),
    };
  }, [historyFiltrado, refBounds, agora]);

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 pt-6">
          <DashboardMultiSelect label="Profit" value={profitFilter} onChange={setProfitFilter} options={opts.profit} />
          <DashboardMultiSelect
            label="Franquia"
            value={franquiaFilter}
            onChange={setFranquiaFilter}
            options={opts.franquia}
          />
          <DashboardMultiSelect label="Status" value={statusFilter} onChange={setStatusFilter} options={opts.status} />
          <DashboardMultiSelect
            label="Tipo Contrato"
            value={tipoFilter}
            onChange={setTipoFilter}
            options={opts.tipo}
          />
          <DashboardMultiSelect
            label="Vencimento"
            value={faixaFilter}
            onChange={setFaixaFilter}
            options={opts.faixa}
          />
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Mês/Ano de Referência</label>
            <Input
              type="month"
              value={mesRef}
              onChange={(e) => setMesRef(e.target.value)}
              className="h-9 w-[180px]"
            />
          </div>
          <Button variant="outline" size="sm" onClick={clearFilters} className="ml-auto">
            Limpar filtros
          </Button>
        </CardContent>
      </Card>

      {/* KPIs — financeiro */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi
          icon={<DollarSign className="h-4 w-4" />}
          label="MRR"
          value={brl(mrr)}
          accent={PRIMARY}
          detail={`${ativosMRR} clientes mensais`}
          tooltip="Receita recorrente mensal dos clientes ativos."
        />
        <Kpi
          icon={<DollarSign className="h-4 w-4" />}
          label="Valor Contratado (TCV)"
          value={brl(valorContratoTCV)}
          accent={PRIMARY}
          detail={`${ativosTCV} contratos TCV`}
          tooltip="Valor total contratado dos clientes ativos com contratos TCV."
        />
        <Kpi
          icon={<TrendingUp className="h-4 w-4" />}
          label="Ticket Médio MRR"
          value={brl(ticketMedio)}
          accent={STATUS.good}
          detail="Clientes mensais"
          tooltip="MRR dividido pela quantidade de clientes mensais ativos."
        />
        <Kpi
          icon={<TrendingUp className="h-4 w-4" />}
          label="Ticket Médio TCV"
          value={brl(ticketMedioTCV)}
          accent={STATUS.good}
          detail="Contratos TCV"
          tooltip="Valor contratado dividido pela quantidade de contratos TCV ativos."
        />
      </div>

      {/* KPIs — carteira */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Kpi
          icon={<Users className="h-4 w-4" />}
          label="Total de Clientes"
          value={totalClientes}
          detail={`${totalMRR} Mensais • ${totalTCV} TCV`}
        />
        <Kpi
          icon={<Check className="h-4 w-4" />}
          label="Ativos"
          value={ativos}
          accent={STATUS.good}
          detail={`${ativosMRR} Mensais • ${ativosTCV} TCV`}
        />
        <Kpi
          icon={<AlertTriangle className="h-4 w-4" />}
          label="Churn"
          value={churn}
          accent={STATUS.critical}
          detail={`${churnRate.toFixed(1)}% da carteira`}
        />
        <Kpi
          icon={<ArrowUpDown className="h-4 w-4" />}
          label="Pausados"
          value={pausados}
          accent={STATUS.warning}
          detail={`${((pausados / Math.max(totalClientes, 1)) * 100).toFixed(1)}% da carteira`}
        />
        <Kpi
          icon={<Building2 className="h-4 w-4" />}
          label="Franquias"
          value={franquias}
          detail={`${(totalClientes / Math.max(franquias, 1)).toFixed(1)} clientes/franquia`}
        />
      </div>

      {/* KPIs — saúde da carteira */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi
          icon={<TrendingUp className="h-4 w-4" />}
          label="Lifetime Médio"
          value={`${lifetimes.lifetimeMedio.toFixed(1)} meses`}
          accent={STATUS.good}
          detail="Tempo médio de permanência"
        />
        <Kpi
          icon={<TrendingUp className="h-4 w-4" />}
          label="Lifetime Médio Contratado"
          value={`${lifetimes.lifetimeMedioContratado.toFixed(1)} meses`}
          accent={STATUS.good}
          detail="TCV conta prazo do contrato"
          tooltip="Para clientes TCV (Trimestral, Semestral, Anual, etc.), considera o prazo integral do contrato vigente; em caso de churn, usa o período exato entre início e churn. Clientes Mensais seguem o cálculo padrão."
        />
        <Kpi
          icon={<TrendingUp className="h-4 w-4" />}
          label="Lifetime Médio (Churn)"
          value={`${lifetimes.lifetimeMedioChurn.toFixed(1)} meses`}
          accent={STATUS.critical}
          detail="Apenas clientes com churn"
          tooltip="Período exato entre o primeiro contrato e o churn, considerando somente clientes que já deram churn."
        />
        <Kpi
          icon={<AlertTriangle className="h-4 w-4" />}
          label="Churn Rate"
          value={`${churnRate.toFixed(1)}%`}
          accent={churnRate > 5 ? STATUS.critical : STATUS.good}
          detail="Clientes perdidos no período"
          tooltip="Quantidade de clientes em churn dividida pelo total de clientes."
        />
      </div>

      {/* Alertas */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <AlertCard
          title="Contratos vencidos (ativos)"
          value={vencidos}
          tone={vencidos > 0 ? "danger" : "ok"}
          description="Ativos com Faixa Vencimento = Vencido"
        />
        <AlertCard
          title="Vencem em até 30 dias"
          value={vencendo30}
          tone={vencendo30 > 0 ? "warn" : "ok"}
          description="Clientes ativos com vencimento próximo"
        />
      </div>

      {/* Charts row 1 */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Status da Carteira</CardTitle>
          </CardHeader>
          <CardContent className="h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={porStatus} dataKey="value" nameKey="name" outerRadius={110} label>
                  {porStatus.map((s, i) => (
                    <Cell key={i} fill={STATUS_COLORS[s.name] ?? FALLBACK[i % FALLBACK.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={chartTooltipStyle}
                  labelStyle={chartTooltipLabelStyle}
                  itemStyle={chartTooltipItemStyle}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top 10 Franquias por MRR</CardTitle>
          </CardHeader>
          <CardContent className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topFranquias} layout="vertical" margin={{ left: 12, right: 72 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={chartGridColor} />
                <XAxis type="number" fontSize={11} tickFormatter={(v) => brl(v)} />
                <YAxis type="category" dataKey="franquia" width={160} fontSize={11} />
                <Tooltip
                  formatter={(v) => brlFull(Number(v))}
                  contentStyle={chartTooltipStyle}
                  labelStyle={chartTooltipLabelStyle}
                  itemStyle={chartTooltipItemStyle}
                />
                <Bar dataKey="mrr" fill={PRIMARY} radius={[0, 4, 4, 0]}>
                  <LabelList dataKey="mrr" position="right" fontSize={11} formatter={(v) => brl(Number(v))} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts row 2 */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribuição por Plano</CardTitle>
          </CardHeader>
          <CardContent className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={porPlano}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
                <XAxis dataKey="plano" fontSize={11} />
                <YAxis fontSize={11} allowDecimals={false} />
                <Tooltip
                  formatter={(v, n) => (n === "mrr" ? brlFull(Number(v)) : Number(v).toLocaleString("pt-BR"))}
                  contentStyle={chartTooltipStyle}
                  labelStyle={chartTooltipLabelStyle}
                  itemStyle={chartTooltipItemStyle}
                />
                <Legend />
                <Bar dataKey="clientes" name="Clientes" fill={PRIMARY} radius={[4, 4, 0, 0]}>
                  {porPlano.map((_, i) => (
                    <Cell key={i} fill={FALLBACK[i % FALLBACK.length]} />
                  ))}
                  <LabelList dataKey="clientes" position="top" fontSize={10} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contratos por Tipo</CardTitle>
          </CardHeader>
          <CardContent className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={porTipo} layout="vertical" margin={{ left: 12, right: 48 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={chartGridColor} />
                <XAxis type="number" fontSize={11} allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={110} fontSize={11} />
                <Tooltip
                  contentStyle={chartTooltipStyle}
                  labelStyle={chartTooltipLabelStyle}
                  itemStyle={chartTooltipItemStyle}
                />
                <Bar dataKey="value" fill={PRIMARY} radius={[0, 4, 4, 0]}>
                  <LabelList dataKey="value" position="right" fontSize={11} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts row 3 */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Vencimento de Contratos (ativos)
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={porFaixa} layout="vertical" margin={{ left: 12, right: 48 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={chartGridColor} />
                <XAxis type="number" fontSize={11} allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={130} fontSize={11} />
                <Tooltip
                  contentStyle={chartTooltipStyle}
                  labelStyle={chartTooltipLabelStyle}
                  itemStyle={chartTooltipItemStyle}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {porFaixa.map((e, i) => (
                    <Cell key={i} fill={FAIXA_COLORS[e.name] ?? FALLBACK[i % FALLBACK.length]} />
                  ))}
                  <LabelList dataKey="value" position="right" fontSize={11} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Crescimento de Clientes por Mês</CardTitle>
          </CardHeader>
          <CardContent className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeSeries} margin={{ left: 8, right: 16, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
                <XAxis dataKey="label" fontSize={10} />
                <YAxis fontSize={11} allowDecimals={false} />
                <Tooltip
                  formatter={(v) => Number(v).toLocaleString("pt-BR")}
                  contentStyle={chartTooltipStyle}
                  labelStyle={chartTooltipLabelStyle}
                  itemStyle={chartTooltipItemStyle}
                />
                <Line
                  type="monotone"
                  dataKey="clientesTotal"
                  name="Clientes ativos"
                  stroke={PRIMARY}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Evolução mensal */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Crescimento de MRR por Mês</CardTitle>
          </CardHeader>
          <CardContent className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeSeries} margin={{ left: 8, right: 16, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
                <XAxis dataKey="label" fontSize={10} />
                <YAxis fontSize={11} tickFormatter={(v) => brl(v)} width={80} />
                <Tooltip
                  formatter={(v) => brlFull(Number(v))}
                  contentStyle={chartTooltipStyle}
                  labelStyle={chartTooltipLabelStyle}
                  itemStyle={chartTooltipItemStyle}
                />
                <Line type="monotone" dataKey="mrrTotal" name="MRR" stroke={PRIMARY} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Clientes Recebidos vs. Perdidos por Mês</CardTitle>
        </CardHeader>
        <CardContent className="h-[340px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={timeSeries} margin={{ left: 8, right: 16, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
              <XAxis dataKey="label" fontSize={10} />
              <YAxis fontSize={11} allowDecimals={false} />
              <Tooltip
                formatter={(v) => Number(v).toLocaleString("pt-BR")}
                contentStyle={chartTooltipStyle}
                labelStyle={chartTooltipLabelStyle}
                itemStyle={chartTooltipItemStyle}
              />
              <Legend />
              <Bar dataKey="recebidos" name="Recebidos" fill={STATUS.good} radius={[4, 4, 0, 0]} />
              <Bar dataKey="perdidos" name="Perdidos" fill={STATUS.critical} radius={[4, 4, 0, 0]} />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Contratos em risco */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            Contratos em risco (vencem em até 30 dias, sem renovação automática)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {contratosEmRisco.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground text-center">
              Nenhum contrato em risco identificado.
            </div>
          ) : (
            <div className="max-h-[520px] w-full overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Franquia</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Valor Mensal</TableHead>
                    <TableHead className="text-right">Vence em</TableHead>
                    <TableHead>Faixa</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contratosEmRisco.map((d) => {
                    const v = d.vencimentoDias ?? 0;
                    const tone =
                      v < 0
                        ? "text-red-600 dark:text-red-400"
                        : v <= 30
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-foreground";
                    return (
                      <TableRow key={d.contratoId}>
                        <TableCell className="font-medium">{d.cliente}</TableCell>
                        <TableCell>{d.franquia}</TableCell>
                        <TableCell>{d.plano}</TableCell>
                        <TableCell>{TIPO_CONTRATO_LABEL[d.tipoContrato]}</TableCell>
                        <TableCell className="text-right tabular-nums">{brl(d.valorMensal)}</TableCell>
                        <TableCell className={`text-right tabular-nums font-medium ${tone}`}>
                          {v < 0 ? `${Math.abs(v)}d vencido` : `${v}d`}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            style={{
                              backgroundColor: FAIXA_COLORS[d.faixaVencimento]
                                ? withAlpha(FAIXA_COLORS[d.faixaVencimento], 18)
                                : undefined,
                              color: FAIXA_COLORS[d.faixaVencimento] ?? "inherit",
                            }}
                          >
                            {d.faixaVencimento}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detalhamento completo */}
      <DetalhamentoCard
        rows={sortedRows}
        clienteSearch={clienteSearch}
        setClienteSearch={setClienteSearch}
        sortKey={sortKey}
        sortDir={sortDir}
        toggleSort={toggleSort}
      />
    </div>
  );
}

function DetalhamentoCard({
  rows,
  clienteSearch,
  setClienteSearch,
  sortKey,
  sortDir,
  toggleSort,
}: {
  rows: ContratoRow[];
  clienteSearch: string;
  setClienteSearch: (v: string) => void;
  sortKey: SortKey | null;
  sortDir: "asc" | "desc";
  toggleSort: (k: SortKey) => void;
}) {
  const q = clienteSearch.trim().toLowerCase();
  const visible = q ? rows.filter((r) => r.cliente.toLowerCase().includes(q)) : rows;

  const downloadCsv = () => {
    const headers = [
      "Cliente",
      "Franquia",
      "Profit",
      "Status",
      "Plano",
      "Tipo Contrato",
      "Valor Mensal",
      "Valor Contrato",
      "Início Contrato",
      "Fim Contrato",
      "Renovação Auto",
      "Vencimento (dias)",
      "Faixa Vencimento",
      "Ativo",
      "Churn",
      "Pausado",
    ];
    const esc = (v: unknown) => {
      const s = v === null || v === undefined ? "" : String(v);
      return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [headers.join(";")];
    for (const d of visible) {
      lines.push(
        [
          d.cliente,
          d.franquia,
          d.profit,
          STATUS_CONTRATO_LABEL[d.status],
          d.plano,
          TIPO_CONTRATO_LABEL[d.tipoContrato],
          d.valorMensal,
          d.valorContrato,
          d.inicioContrato.toISOString().slice(0, 10),
          d.fimContrato ? d.fimContrato.toISOString().slice(0, 10) : "",
          d.renovacaoAutomatica ? "Sim" : "Não",
          d.vencimentoDias ?? "",
          d.faixaVencimento,
          d.ativo ? "Sim" : "Não",
          d.churn ? "Sim" : "Não",
          d.pausado ? "Sim" : "Não",
        ]
          .map(esc)
          .join(";"),
      );
    }
    const blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `detalhamento-clientes-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">
            Detalhamento de Clientes ({visible.length}
            {q && visible.length !== rows.length ? ` de ${rows.length}` : ""})
          </CardTitle>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={clienteSearch}
                onChange={(e) => setClienteSearch(e.target.value)}
                placeholder="Buscar cliente..."
                className="h-9 w-full pl-8 sm:w-64"
              />
            </div>
            <Button variant="outline" size="sm" onClick={downloadCsv} className="gap-2">
              <Download className="h-4 w-4" /> CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="max-h-[520px] w-full overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHead label="Cliente" k="cliente" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                <SortableHead label="Franquia" k="franquia" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                <SortableHead label="Profit" k="profit" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                <SortableHead label="Status" k="status" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                <SortableHead label="Plano" k="plano" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                <SortableHead label="Tipo" k="tipoContrato" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                <SortableHead
                  label="Valor Mensal"
                  k="valorMensal"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onClick={toggleSort}
                  align="right"
                />
                <SortableHead
                  label="Vence em"
                  k="vencimentoDias"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onClick={toggleSort}
                  align="right"
                />
                <SortableHead
                  label="Faixa"
                  k="faixaVencimento"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onClick={toggleSort}
                />
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((d) => {
                const statusLabel = STATUS_CONTRATO_LABEL[d.status];
                const statusColor = STATUS_COLORS[statusLabel];
                return (
                  <TableRow key={d.clienteId}>
                    <TableCell className="font-medium">{d.cliente}</TableCell>
                    <TableCell>{d.franquia}</TableCell>
                    <TableCell>{d.profit}</TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        style={
                          statusColor
                            ? { backgroundColor: withAlpha(statusColor, 18), color: statusColor }
                            : undefined
                        }
                      >
                        {statusLabel}
                      </Badge>
                    </TableCell>
                    <TableCell>{d.plano}</TableCell>
                    <TableCell>{TIPO_CONTRATO_LABEL[d.tipoContrato]}</TableCell>
                    <TableCell className="text-right tabular-nums">{brl(d.valorMensal)}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {d.vencimentoDias !== null ? `${d.vencimentoDias}d` : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{d.faixaVencimento}</TableCell>
                  </TableRow>
                );
              })}
              {visible.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                    Nenhum cliente encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function Kpi({
  label,
  value,
  accent,
  icon,
  tooltip,
  detail,
}: {
  label: string;
  value: React.ReactNode;
  accent?: string;
  icon?: React.ReactNode;
  tooltip?: string;
  detail?: string;
}) {
  return (
    <Card
      className="transition-all duration-200 hover:shadow-lg"
      style={accent ? { borderLeft: `4px solid ${accent}` } : undefined}
    >
      <CardContent className="pt-5">
        <div className="flex items-center justify-between">
          <div className="text-2xl font-bold tracking-tight" style={accent ? { color: accent } : undefined}>
            {value}
          </div>
          {icon && <div className="text-muted-foreground">{icon}</div>}
        </div>
        <span className="text-xs font-semibold text-muted-foreground">{detail ?? "."}</span>
        <div className="mt-2 text-xs uppercase tracking-wide text-muted-foreground">
          <span className="flex items-center justify-between">
            {label}
            {tooltip && (
              <Tooltip2>
                <TooltipTrigger asChild>
                  <span className="cursor-pointer">
                    <Info className="w-4" />
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-64">{tooltip}</p>
                </TooltipContent>
              </Tooltip2>
            )}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function AlertCard({
  title,
  value,
  description,
  tone,
}: {
  title: string;
  value: number;
  description: string;
  tone: "ok" | "warn" | "danger";
}) {
  const color = tone === "danger" ? STATUS.critical : tone === "warn" ? STATUS.warning : STATUS.good;
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-medium">{title}</div>
            <div className="text-xs text-muted-foreground">{description}</div>
          </div>
          <div className="text-3xl font-bold tabular-nums" style={{ color }}>
            {value}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SortableHead({
  label,
  k,
  sortKey,
  sortDir,
  onClick,
  align,
}: {
  label: string;
  k: SortKey;
  sortKey: SortKey | null;
  sortDir: "asc" | "desc";
  onClick: (k: SortKey) => void;
  align?: "right";
}) {
  const active = sortKey === k;
  return (
    <TableHead className={align === "right" ? "text-right" : ""}>
      <button
        type="button"
        onClick={() => onClick(k)}
        className={`inline-flex items-center gap-1 hover:text-foreground ${active ? "text-foreground" : ""}`}
      >
        {label}
        <ArrowUpDown className="h-3 w-3 opacity-60" />
        {active && <span className="text-[10px]">{sortDir === "asc" ? "↑" : "↓"}</span>}
      </button>
    </TableHead>
  );
}
