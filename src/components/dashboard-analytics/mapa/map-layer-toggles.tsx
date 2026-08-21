"use client";

export type Camadas = { franquias: boolean; clientes: boolean; heatmap: boolean };

export function MapLayerToggles({ camadas, onChange }: { camadas: Camadas; onChange: (c: Camadas) => void }) {
  const toggle = (chave: keyof Camadas) => onChange({ ...camadas, [chave]: !camadas[chave] });

  const item = (chave: keyof Camadas, label: string) => (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" checked={camadas[chave]} onChange={() => toggle(chave)} className="h-4 w-4 rounded border-input accent-primary" />
      {label}
    </label>
  );

  return (
    <div className="flex flex-wrap items-center gap-4">
      {item("franquias", "Franquias")}
      {item("clientes", "Clientes")}
      {item("heatmap", "Heatmap")}
    </div>
  );
}
