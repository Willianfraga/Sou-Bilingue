// Regras puras da área Alunos (testadas em test/admin.test.mjs).

export const SITUACOES = ["pagante", "cancelando", "sem_assinatura", "suspenso", "alerta"] as const;
export const ROTULO_SITUACAO: Record<(typeof SITUACOES)[number], string> = {
  pagante: "Pagantes",
  cancelando: "Cancelamento agendado",
  sem_assinatura: "Sem assinatura ativa",
  suspenso: "Suspensos",
  alerta: "Com alerta",
};

export const ROTULO_ALERTA: Record<string, { texto: string; ajuda: string }> = {
  sem_atividade_14d: { texto: "Sem atividade há 14 dias", ajuda: "Assinatura ativa, mas nenhuma aula ou mensagem nos últimos 14 dias (risco de cancelamento)." },
  perto_do_limite: { texto: "Perto do limite do plano", ajuda: "Usou 90% ou mais das horas do ciclo." },
  falhas_ia: { texto: "Falhas da IA", ajuda: "3 ou mais chamadas de IA com erro nos últimos 7 dias." },
  cancelamento_agendado: { texto: "Cancelamento agendado", ajuda: "Pediu para cancelar a renovação." },
};

// "willian@yahoo.com" → "wi***@yahoo.com" (lista; o e-mail completo só na ficha).
export function mascararEmail(email: string | null): string {
  if (!email) return "—";
  const [usuario, dominio] = email.split("@");
  if (!dominio) return "***";
  return `${usuario.slice(0, 2)}***@${dominio}`;
}
