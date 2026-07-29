"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

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

  return (
    <>
      {selected.map((value) => (
        <input key={value} type="hidden" name={name} value={value} />
      ))}
      <DropdownMenu>
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
          {options.map((option) => (
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
