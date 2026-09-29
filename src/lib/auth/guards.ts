import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { PapelUsuario } from "@/lib/types";

export type Sessao = {
  userId: string;
  email: string;
  nome: string;
  papel: PapelUsuario;
};

// Usuário do Supabase Auth, com ou sem linha em profiles — para o cadastro,
// que precisa agir antes de o profile existir.
export async function getUsuarioAutenticado() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export type SessaoComRecuperacao = {
  sessao: Sessao | null;
  authSemProfile: boolean; // true se user existe mas profile não
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
    .select("nome, papel, suspenso_em")
    .eq("id", user.id)
    .single();
  // Conta suspensa pelo painel (ou anonimizada) vale na hora, sem esperar o
  // token de login expirar.
  if (!profile || profile.suspenso_em) return null;

  return {
    userId: user.id,
    email: user.email ?? "",
    nome: profile.nome,
    papel: profile.papel,
  };
}

// Versão que detecta auth sem profile para recuperação
export async function getSessaoComRecuperacao(): Promise<SessaoComRecuperacao> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { sessao: null, authSemProfile: false };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("nome, papel")
    .eq("id", user.id)
    .single();

  if (!profile) {
    // Usuário autenticado mas sem profile — situação anômala
    return {
      sessao: null,
      authSemProfile: true,
    };
  }

  return {
    sessao: {
      userId: user.id,
      email: user.email ?? "",
      nome: profile.nome,
      papel: profile.papel,
    },
    authSemProfile: false,
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
