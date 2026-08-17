import { NextResponse } from "next/server";
import { auth } from "@/auth";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const isLoginRoute = pathname === "/login";
  // Formulário público de NPS: /nps/{franquiaId} (exatamente um segmento).
  // Não cobre /nps (lista de gestão) nem /nps/respostas/{id} (detalhe de
  // gestão) — esses continuam exigindo login.
  const isNpsFormRoute = /^\/nps\/[^/]+$/.test(pathname);

  if (!isLoggedIn && !isLoginRoute && !isNpsFormRoute) {
    const url = new URL("/login", req.nextUrl);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  if (isLoggedIn && isLoginRoute) {
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|.*\\.(?:png|jpg|jpeg|svg|ico)$).*)"],
};
