import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { db } from "@/lib/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  session: { strategy: "jwt" },
  // Railway (como a maioria dos hosts fora da Vercel) fica atrás de um proxy reverso —
  // sem isso o Auth.js não confia no Host encaminhado e monta URLs de redirect quebradas
  // a partir do endereço interno do container.
  trustHost: true,
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;

      const usuario = await db.usuario.findUnique({ where: { email: user.email } });
      if (!usuario || !usuario.ativo || usuario.deletedAt) return false;

      return true;
    },
    async jwt({ token, user }) {
      if (user?.email) {
        const usuario = await db.usuario.findUnique({ where: { email: user.email } });
        if (usuario) {
          token.usuarioId = usuario.id;
          token.role = usuario.role;
          token.franquiaId = usuario.franquiaId;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.usuarioId as string;
        session.user.role = token.role as (typeof session.user)["role"];
        session.user.franquiaId = token.franquiaId as string | null;
      }
      return session;
    },
  },
});
