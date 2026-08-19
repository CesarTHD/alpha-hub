"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
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
import { formatCurrency, formatDate } from "@/lib/format";
import { Plus, Download } from "lucide-react";
import { MultiSelectFilter } from "@/components/filters/multi-select-filter";
import type { ClientesFiltros } from "@/lib/clientes-filtros";
import { buscarClientes, type ClienteListagemRow } from "@/lib/actions/clientes-listagem";

const STORAGE_KEY = "alphahub:filtros:clientes";

const FILTROS_VAZIOS: ClientesFiltros = {
  nome: "",
  status: [],
  tipo: [],
  franquia: [],
  profit: [],
  cidade: [],
  estado: [],
  semD4Sign: false,
};

const STATUS_OPTIONS = [
  { value: "ATIVO", label: "Ativo" },
  { value: "PAUSADO", label: "Pausado" },
  { value: "VENCIDO", label: "Vencido" },
  { value: "ENCERRADO", label: "Encerrado" },
  { value: "CHURN", label: "Churn" },
];

const TIPO_OPTIONS = [
  { value: "MENSAL", label: "Mensal" },
  { value: "TRIMESTRAL", label: "Trimestral" },
  { value: "QUADRIMESTRAL", label: "Quadrimestral" },
  { value: "SEMESTRAL", label: "Semestral" },
  { value: "ANUAL", label: "Anual" },
];

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  ATIVO: "default",
  PAUSADO: "outline",
  VENCIDO: "destructive",
  ENCERRADO: "secondary",
  CHURN: "destructive",
};

function ehVazio(filtros: ClientesFiltros) {
  return (
    !filtros.nome &&
    filtros.status.length === 0 &&
    filtros.tipo.length === 0 &&
    filtros.franquia.length === 0 &&
    filtros.profit.length === 0 &&
    filtros.cidade.length === 0 &&
    filtros.estado.length === 0 &&
    !filtros.semD4Sign
  );
}

function carregarFiltrosSalvos(): ClientesFiltros | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const salvos = JSON.parse(raw) as Partial<ClientesFiltros>;
    const filtros: ClientesFiltros = {
      nome: typeof salvos.nome === "string" ? salvos.nome : "",
      status: Array.isArray(salvos.status) ? salvos.status : [],
      tipo: Array.isArray(salvos.tipo) ? salvos.tipo : [],
      franquia: Array.isArray(salvos.franquia) ? salvos.franquia : [],
      profit: Array.isArray(salvos.profit) ? salvos.profit : [],
      cidade: Array.isArray(salvos.cidade) ? salvos.cidade : [],
      estado: Array.isArray(salvos.estado) ? salvos.estado : [],
      semD4Sign: Boolean(salvos.semD4Sign),
    };
    return ehVazio(filtros) ? null : filtros;
  } catch {
    return null;
  }
}

export function ClientesScreen({
  franquiaOptions,
  profitOptions,
  cidadeOptions,
  estadoOptions,
  podeCriarCliente,
  clientesIniciais,
}: {
  franquiaOptions: { value: string; label: string }[];
  profitOptions: { value: string; label: string }[];
  cidadeOptions: { value: string; label: string }[];
  estadoOptions: { value: string; label: string }[];
  podeCriarCliente: boolean;
  clientesIniciais: ClienteListagemRow[];
}) {
  const [filtros, setFiltros] = useState<ClientesFiltros>(FILTROS_VAZIOS);
  const [clientes, setClientes] = useState<ClienteListagemRow[]>(clientesIniciais);
  const [formKey, setFormKey] = useState(0);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const salvos = carregarFiltrosSalvos();
    if (!salvos) return;
    // Restaura o formulário de imediato (fora de uma transition — senão o
    // React adia o commit até a busca abaixo terminar) e busca os clientes
    // filtrados em paralelo, sem bloquear a restauração dos campos.
    queueMicrotask(() => {
      setFiltros(salvos);
      setFormKey((k) => k + 1);
    });
    buscarClientes(salvos).then((rows) => {
      startTransition(() => {
        setClientes(rows);
      });
    });
  }, []);

  function aplicarFiltros(formData: FormData) {
    const novosFiltros: ClientesFiltros = {
      nome: (formData.get("nome") as string) ?? "",
      status: formData.getAll("status") as string[],
      tipo: formData.getAll("tipo") as string[],
      franquia: formData.getAll("franquia") as string[],
      profit: formData.getAll("profit") as string[],
      cidade: formData.getAll("cidade") as string[],
      estado: formData.getAll("estado") as string[],
      semD4Sign: formData.get("semD4Sign") === "1",
    };
    setFiltros(novosFiltros);
    if (ehVazio(novosFiltros)) {
      window.localStorage.removeItem(STORAGE_KEY);
    } else {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(novosFiltros));
    }
    startTransition(async () => {
      const rows = await buscarClientes(novosFiltros);
      setClientes(rows);
    });
  }

  function limparFiltros() {
    window.localStorage.removeItem(STORAGE_KEY);
    setFiltros(FILTROS_VAZIOS);
    setFormKey((k) => k + 1);
    startTransition(async () => {
      const rows = await buscarClientes(FILTROS_VAZIOS);
      setClientes(rows);
    });
  }

  function exportHref(formato: "csv" | "xlsx") {
    const params = new URLSearchParams();
    if (filtros.nome) params.set("nome", filtros.nome);
    filtros.status.forEach((s) => params.append("status", s));
    filtros.tipo.forEach((t) => params.append("tipo", t));
    filtros.franquia.forEach((f) => params.append("franquia", f));
    filtros.profit.forEach((p) => params.append("profit", p));
    filtros.cidade.forEach((c) => params.append("cidade", c));
    filtros.estado.forEach((e) => params.append("estado", e));
    if (filtros.semD4Sign) params.set("semD4Sign", "1");
    params.set("formato", formato);
    return `/clientes/export?${params.toString()}`;
  }

  const temFiltroAtivo = !ehVazio(filtros);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clientes"
        description="Toda a carteira de clientes da Alpha."
        actions={
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <a href={exportHref("csv")}>
                <Download className="mr-1 h-4 w-4" /> CSV
              </a>
            </Button>
            <Button asChild variant="outline" size="sm">
              <a href={exportHref("xlsx")}>
                <Download className="mr-1 h-4 w-4" /> XLSX
              </a>
            </Button>
            {podeCriarCliente && (
              <Button asChild>
                <Link href="/clientes/novo">
                  <Plus className="mr-1 h-4 w-4" /> Novo cliente
                </Link>
              </Button>
            )}
          </div>
        }
      />

      <Card>
        <CardContent className="pt-6">
          <form
            key={formKey}
            onSubmit={(e) => {
              e.preventDefault();
              aplicarFiltros(new FormData(e.currentTarget));
            }}
            className="flex flex-wrap items-end gap-3"
          >
            <div className="space-y-1 space-x-2">
              <label className="text-xs text-muted-foreground">Nome</label>
              <Input name="nome" defaultValue={filtros.nome} placeholder="Buscar por nome..." className="w-56" />
            </div>
            <div className="space-y-1 space-x-2">
              <label className="text-xs text-muted-foreground">Status</label>
              <MultiSelectFilter
                name="status"
                options={STATUS_OPTIONS}
                defaultValues={filtros.status}
                placeholder="Todos"
              />
            </div>
            <div className="space-y-1 space-x-2">
              <label className="text-xs text-muted-foreground">Tipo</label>
              <MultiSelectFilter
                name="tipo"
                options={TIPO_OPTIONS}
                defaultValues={filtros.tipo}
                placeholder="Todos"
              />
            </div>
            <div className="space-y-1 space-x-2">
              <label className="text-xs text-muted-foreground">Franquia</label>
              <MultiSelectFilter
                name="franquia"
                options={franquiaOptions}
                defaultValues={filtros.franquia}
                placeholder="Todas"
              />
            </div>
            <div className="space-y-1 space-x-2">
              <label className="text-xs text-muted-foreground">Profit</label>
              <MultiSelectFilter
                name="profit"
                options={profitOptions}
                defaultValues={filtros.profit}
                placeholder="Todos"
              />
            </div>
            <div className="space-y-1 space-x-2">
              <label className="text-xs text-muted-foreground">Cidade</label>
              <MultiSelectFilter
                name="cidade"
                options={cidadeOptions}
                defaultValues={filtros.cidade}
                placeholder="Todas"
              />
            </div>
            <div className="space-y-1 space-x-2">
              <label className="text-xs text-muted-foreground">Estado</label>
              <MultiSelectFilter
                name="estado"
                options={estadoOptions}
                defaultValues={filtros.estado}
                placeholder="Todos"
              />
            </div>
            <div className="flex items-center gap-2 pb-2">
              <input
                type="checkbox"
                id="semD4Sign"
                name="semD4Sign"
                value="1"
                defaultChecked={filtros.semD4Sign}
                className="h-4 w-4"
              />
              <label htmlFor="semD4Sign" className="text-sm text-muted-foreground">
                Sem D4Sign cadastrado
              </label>
            </div>
            <Button type="submit" variant="secondary" disabled={pending}>
              Filtrar
            </Button>
            {temFiltroAtivo && (
              <Button type="button" variant="ghost" onClick={limparFiltros} disabled={pending}>
                Limpar
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        {clientes.length} {clientes.length === 1 ? "cliente encontrado" : "clientes encontrados"}
      </p>

      <Table className={pending ? "opacity-60 transition-opacity" : undefined}>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Franquia</TableHead>
            <TableHead>Profit</TableHead>
            <TableHead>Plano</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Valor mensal</TableHead>
            <TableHead>Início de contrato</TableHead>
            <TableHead>Fim de contrato</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clientes.map((c) => (
            <TableRow key={c.id} className="cursor-pointer">
              <TableCell className="font-medium">
                <Link href={`/clientes/${c.id}`} className="hover:underline">
                  {c.nome}
                </Link>
              </TableCell>
              <TableCell>
                {c.franquiaNome ? (
                  <span className={c.franquiaAtiva ? undefined : "text-muted-foreground"}>
                    {c.franquiaNome}
                    {!c.franquiaAtiva && " (encerrado)"}
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell>
                {c.profitNome ?? <span className="text-muted-foreground">—</span>}
              </TableCell>
              <TableCell className="">
                <span
                  className={`px-2 rounded-2xl text-xs text-center ${
                    c.plano?.toUpperCase() === "SILVER"
                      ? "bg-gray-600 text-white"
                      : c.plano?.toUpperCase() === "GOLD"
                        ? "bg-amber-400"
                        : ""
                  }`}
                >
                  {c.plano ?? "—"}
                </span>
              </TableCell>
              <TableCell>{c.tipoContrato ? c.tipoContrato.charAt(0) + c.tipoContrato.slice(1).toLocaleLowerCase() : "—"}</TableCell>
              <TableCell>{c.valorMensal ? formatCurrency(c.valorMensal) : "—"}</TableCell>
              <TableCell>{formatDate(c.inicioContrato)}</TableCell>
              <TableCell>{formatDate(c.fimContrato)}</TableCell>
              <TableCell>
                {c.status ? <Badge variant={statusVariant[c.status]}>{c.status}</Badge> : "—"}
              </TableCell>
            </TableRow>
          ))}
          {clientes.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                {temFiltroAtivo ? "Nenhum cliente encontrado para esse filtro." : "Nenhum cliente cadastrado ainda."}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
