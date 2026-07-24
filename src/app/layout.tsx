import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AlphaHUB - Comercial",
  description: "Gestão de clientes, contratos e eventos da Alpha",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="h-full">
        <div className="flex h-full min-h-screen">
          <aside className="hidden w-60 shrink-0 border-r border-border bg-sidebar md:block">
            <div className="px-4 py-4">
              <span className="text-base font-semibold tracking-tight">AlphaHUB - Comercial</span>
            </div>
            <SidebarNav />
          </aside>
          <div className="flex min-w-0 flex-1 flex-col">
            <header className="flex h-14 items-center gap-3 border-b border-border px-4 md:hidden">
              <MobileNav />
              <span className="text-base font-semibold tracking-tight">AlphaHUB - Comercial</span>
            </header>
            <main className="flex-1 overflow-x-hidden px-4 py-6 sm:px-6 lg:px-8">
              {children}
            </main>
          </div>
        </div>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
