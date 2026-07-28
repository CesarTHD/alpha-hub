import { SidebarNav } from "@/components/layout/sidebar-nav";
import { MobileNav } from "@/components/layout/mobile-nav";
import { getCurrentUser } from "@/lib/current-user";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();

  return (
    <div className="flex h-full min-h-screen">
      <aside className="hidden w-60 shrink-0 border-r border-border bg-sidebar md:block">
        <div className="px-4 py-4">
          <span className="text-base font-semibold tracking-tight">AlphaHUB - Operacional</span>
        </div>
        <SidebarNav role={user.role} />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center gap-3 border-b border-border px-4 md:hidden">
          <MobileNav role={user.role} />
          <span className="text-base font-semibold tracking-tight">AlphaHUB - Operacional</span>
        </header>
        <main className="flex-1 overflow-x-hidden px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
