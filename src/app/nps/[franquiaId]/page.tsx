import { db } from "@/lib/db";
import { NpsForm } from "@/components/nps/nps-form";
import { AlphaLogo } from "@/components/nps/alpha-logo";

export const dynamic = "force-dynamic";

export default async function NpsFormularioPage({
  params,
}: {
  params: Promise<{ franquiaId: string }>;
}) {
  const { franquiaId } = await params;
  const franquia = await db.franquia.findFirst({
    where: { id: franquiaId, ativo: true, deletedAt: null },
    select: { id: true, nome: true },
  });

  if (!franquia) {
    return (
      <div className="flex min-h-screen flex-col bg-neutral-950">
        <header className="border-b border-neutral-800">
          <div className="mx-auto flex w-full max-w-md items-center px-4 py-4">
            <AlphaLogo />
          </div>
        </header>
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-4 py-10 text-center">
          <h1 className="text-xl font-bold text-white">Formulário não encontrado</h1>
          <p className="mt-3 max-w-xs text-sm text-neutral-400">
            Esse link não corresponde a nenhum formulário ativo. Confira com quem te enviou o link.
          </p>
        </main>
      </div>
    );
  }

  return <NpsForm franquiaId={franquia.id} franquiaNome={franquia.nome} />;
}
