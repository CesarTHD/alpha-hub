import {
  LayoutDashboard,
  Users,
  Building2,
  UserCog,
  ScrollText,
  ShieldCheck,
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
    roles: ["ADMIN", "CEO", "DIRETOR", "PROFIT", "FRANQUEADO"],
  },
  { href: "/clientes", label: "Clientes", icon: Users },
  {
    href: "/franquias",
    label: "Franquias",
    icon: Building2,
    roles: ["ADMIN", "CEO", "DIRETOR", "PROFIT"],
  },
  {
    href: "/profits",
    label: "Profits",
    icon: UserCog,
    roles: ["ADMIN", "CEO", "DIRETOR", "PROFIT"],
  },
  { href: "/eventos", label: "Eventos", icon: ScrollText },
  { href: "/usuarios", label: "Usuários", icon: ShieldCheck, roles: ["ADMIN"] },
];
