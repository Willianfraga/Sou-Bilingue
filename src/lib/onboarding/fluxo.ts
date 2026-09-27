// Decisões de navegação do onboarding pedagógico. Puro, para ser testado sem
// servidor: o layout do aluno e a página /boas-vindas só executam o que isto
// decide.

export const ROTA_ONBOARDING = "/boas-vindas";
export const ROTA_PRIMEIRA_AULA = "/aluno/aula";

export type EstadoOnboarding = {
  concluidoEm: string | null;
} | null;

export type ModoEntrevista = "novo" | "editar" | "refazer";

export function onboardingConcluido(estado: EstadoOnboarding): boolean {
  return Boolean(estado?.concluidoEm);
}

// Área do aluno: sem onboarding concluído, vai para a entrevista.
export function redirecionamentoDaAreaDoAluno(estado: EstadoOnboarding): string | null {
  return onboardingConcluido(estado) ? null : ROTA_ONBOARDING;
}

// /boas-vindas: quem já concluiu só fica se pediu para editar ou refazer.
export function modoDaEntrevista(estado: EstadoOnboarding, pedido: unknown): ModoEntrevista | "liberado" {
  if (!onboardingConcluido(estado)) return "novo";
  if (pedido === "editar" || pedido === "refazer") return pedido;
  return "liberado";
}
