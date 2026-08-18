import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Renova a sessão a cada requisição e barra rota privada sem sessão. O RLS
// do banco continua sendo a barreira real — isto aqui só evita mostrar uma
// tela quebrada antes do usuário ser barrado (mesmo padrão do "academia flow").
const CAMINHOS_PUBLICOS = [
  "/login",
  "/verificar", // § 06: verificação pública de certificado, sem login
  "/checkout", // ainda adiado (§ 12), mas fica público quando existir
  "/api/aula/chat", // TEMPORÁRIO — sem cadastro de aluno real ainda (ver CLAUDE.md)
];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  // "/" decide sozinha pra onde mandar (ver page.tsx) — não é público nem
  // privado aqui, só deixa passar.
  const isPublico =
    path === "/" || CAMINHOS_PUBLICOS.some((p) => path.startsWith(p));

  if (!user && !isPublico) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", path);
    return NextResponse.redirect(url);
  }

  if (user && path === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
