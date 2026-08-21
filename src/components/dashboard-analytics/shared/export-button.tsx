"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Botão de export CSV client-side — mesmo padrão de download (Blob +
 *  URL.createObjectURL) usado em DetalhamentoCard no dashboard atual. `csv`
 *  já vem pronto (com BOM) de buildCsv() (src/lib/export/csv.ts). */
export function ExportCsvButton({ csv, filename, label = "Exportar CSV" }: { csv: string; filename: string; label?: string }) {
  const download = () => {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Button variant="outline" size="sm" onClick={download}>
      <Download className="h-4 w-4" />
      {label}
    </Button>
  );
}
