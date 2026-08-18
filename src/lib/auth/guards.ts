import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { PapelUsuario } from "@/lib/types";

export type Sessao = {
  userId: string;
  email: string;
  nome: string;
  papel: PapelUsuario;
};

// Resolve o usuário logado + o papel dele (profiles.papel). Toda rota
// autenticada começa por aqui — nunca confie em "quem é o usuário" vindo de
// outro lugar (corpo da requisição, query string).
export async function getSessao(): Promise<Sessao | null> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("nome, papel")
    .eq("id", user.id)
    .single();
  if (!profile) return null;

  return {
    userId: user.id,
    email: user.email ?? "",
    nome: profile.nome,
    papel: profile.papel,
  };
}

export async function requireSessao(): Promise<Sessao> {
  const sessao = await getSessao();
  if (!sessao) redirect("/login");
  return sessao;
}

export function rotaDoPapel(papel: PapelUsuario): string {
  if (papel === "aluno") return "/aluno";
  if (papel === "responsavel") return "/responsavel";
  return "/admin";
}

// Barreira de aplicação que acompanha o RLS do banco — defesa em
// profundidade: se uma falhar, a outra segura. Usada no topo de cada layout
// de interface (aluno/responsável/admin).
export async function requirePapel(papel: PapelUsuario): Promise<Sessao> {
  const sessao = await requireSessao();
  if (sessao.papel !== papel) {
    redirect(rotaDoPapel(sessao.papel));
  }
  return sessao;
}
