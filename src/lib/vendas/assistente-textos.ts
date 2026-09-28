// Textos e limites do assistente usados também no navegador (sem o prompt,
// que fica só no servidor: src/lib/vendas/assistente.ts).

export const LIMITES_ASSISTENTE = {
  mensagens: 16, // histórico enviado ao modelo (as mais recentes)
  caracteres: 600, // por mensagem do visitante
  respostaTokens: 450,
  porIp: { maximo: 20, janelaMs: 10 * 60_000 },
  // Teto diário do app inteiro (protege os créditos da Anthropic).
  // Configurável por ASSISTENTE_LIMITE_DIARIO.
  diarioPadrao: 800,
} as const;

export const PAGINAS_DO_ASSISTENTE = ["vendas", "cadastro", "checkout", "contato", "reembolso"] as const;
export type PaginaDoAssistente = (typeof PAGINAS_DO_ASSISTENTE)[number];

export type MensagemAssistente = { papel: "cliente" | "assistente"; texto: string };

export const SAUDACAO =
  "Oi! Eu sou o assistente virtual do Sou Bilíngue. Posso tirar suas dúvidas sobre as aulas, os planos, o pagamento e o cancelamento. O que você quer saber?";

export const CONVITE = "Ficou com alguma dúvida? Estou aqui pra tirar 😊";

export const SUGESTOES = [
  "Como funciona a aula?",
  "Qual plano combina comigo?",
  "Sou iniciante, consigo acompanhar?",
  "E se eu não gostar? Tem reembolso?",
];

export const RESPOSTA_INDISPONIVEL =
  "Não consegui responder agora. Você pode ver as perguntas frequentes na página inicial ou falar com a gente pela página /contato.";
