// Sessões de aula (Fase 3). Quem conta e desconta horas é o banco
// (funções horas_* da migration 0025, só service role); este módulo só
// chama as funções com o aluno da sessão de login, nunca um id vindo do
// navegador. Ver docs/fase3-horas.md.
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type InicioDeSessao =
  | { ok: true; sessaoId: string; horasRestantes: number }
  | { ok: false; erro: "sem_assinatura" | "sem_horas" | "falha" };

export type SinalDeSessao =
  | { ok: true; horasRestantes: number; esgotou: boolean }
  | { ok: false; erro: "sessao_encerrada" | "falha" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function sessaoIdValido(id: unknown): id is string {
  return typeof id === "string" && UUID.test(id);
}

export async function iniciarSessaoDeAula(alunoId: string): Promise<InicioDeSessao> {
  const { data, error } = await createSupabaseAdminClient().rpc("horas_iniciar_sessao", { p_aluno: alunoId });
  if (error || !data) {
    console.error("Falha ao iniciar sessão de aula:", error?.message);
    return { ok: false, erro: "falha" };
  }
  if (!data.ok) return { ok: false, erro: data.erro === "sem_horas" ? "sem_horas" : "sem_assinatura" };
  return { ok: true, sessaoId: data.sessao_id, horasRestantes: Number(data.horas_restantes) || 0 };
}

export async function sinalDaSessao(alunoId: string, sessaoId: string, segundos: number): Promise<SinalDeSessao> {
  if (!sessaoIdValido(sessaoId)) return { ok: false, erro: "sessao_encerrada" };
  const { data, error } = await createSupabaseAdminClient().rpc("horas_sinal", {
    p_aluno: alunoId,
    p_sessao: sessaoId,
    p_segundos: Math.max(0, Math.floor(Number(segundos) || 0)),
  });
  if (error || !data) {
    console.error("Falha no sinal da sessão de aula:", error?.message);
    return { ok: false, erro: "falha" };
  }
  if (!data.ok) return { ok: false, erro: "sessao_encerrada" };
  return { ok: true, horasRestantes: Number(data.horas_restantes) || 0, esgotou: Boolean(data.esgotou) };
}

export async function encerrarSessaoDeAula(alunoId: string, sessaoId: string) {
  if (!sessaoIdValido(sessaoId)) return { ok: false as const };
  const { data, error } = await createSupabaseAdminClient().rpc("horas_encerrar_sessao", { p_sessao: sessaoId, p_aluno: alunoId });
  if (error) {
    console.error("Falha ao encerrar sessão de aula:", error.message);
    return { ok: false as const };
  }
  return { ok: Boolean(data?.ok), minutos: Number(data?.minutos) || 0, cobrado: Boolean(data?.cobrado) };
}

// Envia o tempo que faltava e encerra (pausa, "encerrar aula", saída da página).
export async function fecharSessaoDeAula(alunoId: string, sessaoId: string, segundosPendentes: number) {
  if (segundosPendentes > 0) await sinalDaSessao(alunoId, sessaoId, segundosPendentes);
  return encerrarSessaoDeAula(alunoId, sessaoId);
}
