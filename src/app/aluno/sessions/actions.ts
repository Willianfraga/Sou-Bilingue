"use server";

import { requirePapel } from "@/lib/auth/guards";
import { fecharSessaoDeAula, iniciarSessaoDeAula, sinalDaSessao } from "@/lib/billing/sessoes-de-aula";

// Contagem de horas da aula (Fase 3): começa quando a conversa começa,
// recebe o tempo ativo a cada 30 s e fecha ao pausar/encerrar. O aluno vem
// sempre do login; o banco limita o tempo informado ao tempo real.

export async function iniciarSessaoAction() {
  const sessao = await requirePapel("aluno");
  return iniciarSessaoDeAula(sessao.userId);
}

export async function sinalSessaoAction(sessaoId: string, segundos: number) {
  const sessao = await requirePapel("aluno");
  return sinalDaSessao(sessao.userId, sessaoId, segundos);
}

export async function encerrarSessaoAction(sessaoId: string, segundosPendentes: number) {
  const sessao = await requirePapel("aluno");
  return fecharSessaoDeAula(sessao.userId, sessaoId, segundosPendentes);
}
