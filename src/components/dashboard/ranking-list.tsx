import { formatCurrency } from "@/lib/format";

export function RankingList({
  items,
}: {
  items: { id: string; nome: string; mrr: number; clientes: number }[];
}) {
  const max = Math.max(...items.map((i) => i.mrr), 1);

  if (items.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">Sem dados ainda.</p>;
  }

  return (
    <ul className="space-y-3">
      {items.slice(0, 8).map((item) => (
        <li key={item.id} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{item.nome}</span>
            <span className="text-muted-foreground">
              {formatCurrency(item.mrr)} · {item.clientes} cliente(s)
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${Math.max((item.mrr / max) * 100, 2)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
