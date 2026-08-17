"use client";

import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** Multi-select instantâneo (sem FormData), controlado por `value`/`onChange` —
 *  para filtros que recalculam em memória a cada clique, como no Dashboard. */
export function DashboardMultiSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string[];
  onChange: (v: string[]) => void;
  options: string[];
}) {
  const toggle = (opt: string) =>
    onChange(value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt]);
  const display =
    value.length === 0 ? "Todos" : value.length === 1 ? value[0] : `${value.length} selecionados`;

  return (
    <div className="flex min-w-[170px] flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-9 w-full justify-between font-normal">
            <span className={value.length === 0 ? "truncate text-muted-foreground" : "truncate"}>
              {display}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="max-h-64 w-56 overflow-y-auto">
          {options.length === 0 && (
            <p className="px-2 py-2 text-center text-sm text-muted-foreground">Sem opções.</p>
          )}
          {options.map((option) => (
            <DropdownMenuCheckboxItem
              key={option}
              checked={value.includes(option)}
              onSelect={(e) => e.preventDefault()}
              onCheckedChange={() => toggle(option)}
            >
              {option}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
