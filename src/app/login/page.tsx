import { signIn } from "@/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
}) {
  const { error, callbackUrl } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">AlphaHUB - Operacional</h1>
          <p className="text-sm text-muted-foreground">
            Gestão de clientes, contratos e eventos da Alpha
          </p>
        </div>

        {error && (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            Seu e-mail não possui acesso à plataforma. Entre em contato com um administrador.
          </p>
        )}

        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: callbackUrl || "/" });
          }}
        >
          <button
            type="submit"
            className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 cursor-pointer"
          >
            Entrar com Google
          </button>
        </form>
      </div>
    </div>
  );
}
