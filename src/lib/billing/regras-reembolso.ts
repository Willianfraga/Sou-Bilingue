// Regras de reembolso — módulo puro (testado em test/reembolso.test.mjs).
// Política completa e pontos para revisão jurídica: docs/refund-policy.md.

// Direito de arrependimento (CDC art. 49): 7 dias corridos.
export const PRAZO_ARREPENDIMENTO_DIAS = 7;

// Horário de Brasília (UTC-3, sem horário de verão desde 2019).
export const FUSO_DO_NEGOCIO = "America/Sao_Paulo";
const OFFSET_BRASILIA = "-03:00";

// Data "AAAA-MM-DD" do calendário de Brasília para um instante.
export function dataEmBrasilia(instante: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: FUSO_DO_NEGOCIO, year: "numeric", month: "2-digit", day: "2-digit" }).format(instante);
}

// Fim do prazo: 23:59:59.999 (Brasília) do 7º dia corrido após a data de
// confirmação do 1º pagamento. Pago em 10/09 → vale até 17/09 23:59:59.
export function fimDoPrazo(dataConfirmacao: string): Date {
  const [a, m, d] = dataConfirmacao.slice(0, 10).split("-").map(Number);
  const base = new Date(Date.UTC(a, m - 1, d + PRAZO_ARREPENDIMENTO_DIAS));
  const ymd = base.toISOString().slice(0, 10);
  return new Date(`${ymd}T23:59:59.999${OFFSET_BRASILIA}`);
}

export function dentroDoPrazo(dataConfirmacao: string, agora: Date): boolean {
  return agora.getTime() <= fimDoPrazo(dataConfirmacao).getTime();
}

export const MOTIVOS_DE_REEMBOLSO = [
  "Não tenho tempo para estudar",
  "O conteúdo não atendeu às expectativas",
  "Encontrei dificuldades para usar o aplicativo",
  "Problemas técnicos",
  "Preço",
  "Cobrança indevida ou duplicada",
  "Não reconheço a compra",
  "Quero mudar de plano",
  "Outro",
] as const;

// Motivos que, fora do prazo, apontam hipótese legal a analisar com
// prioridade (não é aprovação automática).
export const MOTIVOS_DE_EXCECAO = new Set(["Cobrança indevida ou duplicada", "Não reconheço a compra", "Problemas técnicos"]);

export type ValidacaoPedido = { ok: true; motivo: string | null; comentario: string | null } | { ok: false; erro: string };

// Dentro do prazo o motivo é opcional; depois do prazo é obrigatório.
export function validarPedidoDeReembolso(p: { dentroDoPrazo: boolean; motivo: unknown; comentario: unknown }): ValidacaoPedido {
  const motivo = typeof p.motivo === "string" && (MOTIVOS_DE_REEMBOLSO as readonly string[]).includes(p.motivo) ? p.motivo : null;
  const comentario =
    typeof p.comentario === "string" && p.comentario.trim()
      ? p.comentario.replace(/[\u0000-\u001f\u007f<>]/g, " ").trim().slice(0, 1000)
      : null;
  if (!p.dentroDoPrazo && !motivo) {
    return { ok: false, erro: "Depois do prazo de 7 dias, escolha o motivo para registrarmos sua solicitação." };
  }
  return { ok: true, motivo, comentario };
}

export type StatusReembolso = "REQUESTED" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "PROCESSING" | "REFUNDED" | "FAILED";

// Ordem de avanço: um evento atrasado ou repetido nunca faz o status voltar.
const ETAPA: Record<StatusReembolso, number> = {
  REQUESTED: 0,
  UNDER_REVIEW: 1,
  APPROVED: 2,
  PROCESSING: 3,
  FAILED: 3,
  REJECTED: 9,
  REFUNDED: 9,
};

export function podeMudar(de: StatusReembolso, para: StatusReembolso): boolean {
  if (de === para) return false;
  if (de === "REFUNDED" || de === "REJECTED") return false; // finais
  if (de === "FAILED") return para === "PROCESSING" || para === "REFUNDED" || para === "REJECTED"; // reprocessar
  // Enviado ao provedor: só ele decide o desfecho — não dá mais para negar.
  if (de === "PROCESSING") return para === "REFUNDED" || para === "FAILED";
  return ETAPA[para] >= ETAPA[de];
}

// Evento do Asaas → status do pedido.
export function statusDoEventoAsaas(evento: string): StatusReembolso | null {
  switch (evento) {
    case "PAYMENT_REFUNDED":
    case "PAYMENT_PARTIALLY_REFUNDED":
      return "REFUNDED";
    case "PAYMENT_REFUND_IN_PROGRESS":
      return "PROCESSING";
    case "PAYMENT_REFUND_DENIED":
      return "FAILED";
    default:
      return null;
  }
}

export function gerarProtocolo(agora: Date, aleatorio: string): string {
  return `RB-${dataEmBrasilia(agora).replaceAll("-", "")}-${aleatorio.replace(/[^A-Z0-9]/gi, "").slice(0, 6).toUpperCase()}`;
}

export const ROTULO_STATUS: Record<StatusReembolso, string> = {
  REQUESTED: "Solicitado",
  UNDER_REVIEW: "Em análise",
  APPROVED: "Aprovado — enviando ao pagamento",
  REJECTED: "Negado",
  PROCESSING: "Em processamento no provedor de pagamento",
  REFUNDED: "Reembolsado",
  FAILED: "Falhou — nossa equipe vai verificar",
};

export function formatarDataHoraBrasilia(instante: Date): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO_DO_NEGOCIO, dateStyle: "short", timeStyle: "short" }).format(instante);
}
