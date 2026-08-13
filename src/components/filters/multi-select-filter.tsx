"use client";

import { useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

/** Sem acento e minúsculo, pra buscar "sao paulo" e achar "São Paulo". */
const DIACRITICOS = new RegExp("[\\u0300-\\u036f]", "g");

function normalizar(v: string): string {
  return v.normalize("NFD").replace(DIACRITICOS, "").toLowerCase();
}

// Só faz sentido a busca aparecer quando há opções suficientes pra rolar —
// com poucas, é só mais um campo pra clicar antes de achar o que já está visível.
const MINIMO_PARA_BUSCA = 8;

export function MultiSelectFilter({
  name,
  options,
  defaultValues = [],
  placeholder,
  className,
}: {
  name: string;
  options: { value: string; label: string }[];
  defaultValues?: string[];
  placeholder: string;
  className?: string;
}) {
  const [selected, setSelected] = useState<string[]>(defaultValues);
  const [busca, setBusca] = useState("");

  function toggle(value: string) {
    setSelected((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  }

  const label =
    selected.length === 0
      ? placeholder
      : selected.length === 1
        ? (options.find((o) => o.value === selected[0])?.label ?? selected[0])
        : `${selected.length} selecionados`;

  const opcoesFiltradas = busca.trim()
    ? options.filter((o) => normalizar(o.label).includes(normalizar(busca)))
    : options;

  return (
    <>
      {selected.map((value) => (
        <input key={value} type="hidden" name={name} value={value} />
      ))}
      <DropdownMenu
        onOpenChange={(open) => {
          if (!open) setBusca("");
        }}
      >
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={cn("h-9 w-56 justify-between font-normal", className)}
          >
            <span className={cn("truncate", selected.length === 0 && "text-muted-foreground")}>
              {label}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          {options.length >= MINIMO_PARA_BUSCA && (
            <div className="relative mb-1 px-0.5">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                placeholder="Buscar..."
                className="h-8 w-full rounded-md border border-input bg-transparent pl-7 pr-2 text-sm outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
          )}
          {opcoesFiltradas.length === 0 && (
            <p className="px-1.5 py-2 text-center text-sm text-muted-foreground">Nada encontrado.</p>
          )}
          {opcoesFiltradas.map((option) => (
            <DropdownMenuCheckboxItem
              key={option.value}
              checked={selected.includes(option.value)}
              onSelect={(e) => e.preventDefault()}
              onCheckedChange={() => toggle(option.value)}
            >
              {option.label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
