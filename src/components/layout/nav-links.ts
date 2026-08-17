import {
  LayoutDashboard,
  Users,
  Building2,
  UserCog,
  ScrollText,
  ShieldCheck,
  FileSearch,
  Gauge,
} from "lucide-react";
import type { Role } from "@/generated/prisma/client";

export type NavLink = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  /** Undefined means visible to every role. */
  roles?: Role[];
};

export const navLinks: NavLink[] = [
  {
    href: "/",
    label: "Dashboard",
    icon: LayoutDashboard,
    roles: ["ADMIN", "CEO", "DIRETOR", "PROFIT", "FRANQUEADO", "NPS"],
  },
  { href: "/clientes", label: "Clientes", icon: Users },
  {
    href: "/franquias",
    label: "Franquias",
    icon: Building2,
    roles: ["ADMIN", "CEO", "DIRETOR", "PROFIT", "NPS"],
  },
  {
    href: "/profits",
    label: "Profits",
    icon: UserCog,
    roles: ["ADMIN", "CEO", "DIRETOR", "PROFIT", "NPS"],
  },
  { href: "/eventos", label: "Eventos", icon: ScrollText },
  { href: "/nps", label: "NPS", icon: Gauge, roles: ["ADMIN", "NPS"] },
  { href: "/usuarios", label: "Usuários", icon: ShieldCheck, roles: ["ADMIN"] },
  { href: "/d4sign-revisao", label: "Revisão D4Sign", icon: FileSearch, roles: ["ADMIN"] },
];
