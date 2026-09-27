import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { garantirProfileAluno, nomeValido } from "@/lib/auth/profile";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Destino do link de confirmação de e-mail do cadastro. Com confirmação
// ligada, o signUp não devolve sessão e o profile não pode ser criado na hora
// — é criado aqui, depois que o Supabase confirma o e-mail e abre a sessão.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? url.origin;
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;

  const falha = () =>
    NextResponse.redirect(`${base}/login?erro=confirmacao`);

  const supabase = await createSupabaseServerClient();

  // Fluxo PKCE (padrão do @supabase/ssr) manda `code`; template de e-mail
  // customizado com {{ .TokenHash }} manda `token_hash` + `type`.
  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && type
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      : { error: new Error("Link de confirmação sem código.") };

  if (error) {
    console.error("Erro ao confirmar e-mail:", error.message);
    return falha();
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return falha();
  }

  const nome = String(user.user_metadata?.nome ?? "").trim();
  if (nomeValido(nome) && (await garantirProfileAluno(user.id, nome))) {
    return NextResponse.redirect(`${base}/cadastro/onboarding`);
  }

  // Sem nome válido no metadata (ou falha ao gravar): a sessão já existe, então
  // o middleware manda para /cadastro, que cria o profile pelo fluxo normal.
  return NextResponse.redirect(`${base}/cadastro`);
}
