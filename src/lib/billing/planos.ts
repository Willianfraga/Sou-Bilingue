// Regras comerciais dos planos pagos (tabela public.planos). Módulo puro —
// sem Supabase — para ser usado na página de vendas, no checkout, no
// webhook e nos testes. Preços e horas vêm do banco; aqui ficam só as regras.
// Análise de custo que motivou cada regra: docs/CUSTOS_IA.md.

// 1ª mensalidade com desconto (promessa da página de vendas).
export const DESCONTO_PRIMEIRA_MENSALIDADE = 50; // %

// Plano de teste: cobrança única, sem desconto e fora da vitrine de planos.
export const PLANOS_DE_TESTE = new Set(["teste_7dias"]);

// Planos que usam a voz gratuita do navegador em vez da ElevenLabs. Vazio
// desde 07/10/2026: o dono achou a voz do navegador robotizada e todos os
// planos passaram à voz ElevenLabs (impacto no custo: docs/CUSTOS_IA.md).
// A voz do navegador continua só como reserva quando a ElevenLabs falha.
export const PLANOS_COM_VOZ_DO_NAVEGADOR = new Set<string>();

const NOME_DE_EXIBICAO: Record<string, string> = {
  teste_7dias: "Teste 7 dias",
  essencial: "Essencial",
  fluencia: "Fluência",
  premium: "Premium",
};

// Para quem cada plano foi pensado (texto da página de vendas).
const PUBLICO_DO_PLANO: Record<string, string> = {
  essencial: "Para criar o hábito com algumas conversas por semana.",
  fluencia: "Para quem quer praticar quase todos os dias.",
  premium: "Para quem quer mais horas de conversa e imersão.",
};

export function publicoDoPlano(nome: string): string {
  return PUBLICO_DO_PLANO[nome] ?? "";
}

// Plano pago (tabela planos) → faixa usada pela certificação (alunos.plano,
// dias de aula por semana em src/lib/types.ts). Gravado pelo webhook quando o
// pagamento é confirmado.
const PLANO_DA_CERTIFICACAO: Record<string, "basico" | "intermediario" | "avancado"> = {
  teste_7dias: "basico",
  essencial: "basico",
  fluencia: "intermediario",
  premium: "avancado",
};

export function planoDaCertificacao(nome: string): "basico" | "intermediario" | "avancado" {
  return PLANO_DA_CERTIFICACAO[nome] ?? "basico";
}

// Plano destacado na vitrine (futuro teste A/B: trocar aqui).
export const PLANO_RECOMENDADO = "fluencia";

export function nomeDeExibicao(nome: string): string {
  return NOME_DE_EXIBICAO[nome] ?? nome.charAt(0).toUpperCase() + nome.slice(1);
}

export function temDescontoNaPrimeira(nome: string): boolean {
  return !PLANOS_DE_TESTE.has(nome);
}

export function valorPrimeiraMensalidade(preco: number, nome: string): number {
  if (!temDescontoNaPrimeira(nome)) return preco;
  return Math.round(preco * (100 - DESCONTO_PRIMEIRA_MENSALIDADE)) / 100;
}

export function planoTemVozPremium(nomeDoPlano: string | null | undefined): boolean {
  if (!nomeDoPlano) return false; // sem assinatura ativa, nada de custo premium
  return !PLANOS_COM_VOZ_DO_NAVEGADOR.has(nomeDoPlano);
}

export function formatarPreco(valor: number): string {
  return `R$ ${valor.toFixed(2).replace(".", ",")}`;
}

// Como o cliente vê as horas do plano: em aulas de 1 hora (o tempo é contado
// por minuto de conversa; o aluno pode dividir em aulas mais curtas).
// Ex.: 12 → "12 aulas de 1 hora por mês".
export function aulasDoPlano(horasMensais: number): string {
  return `${horasMensais} ${horasMensais === 1 ? "aula" : "aulas"} de 1 hora por mês`;
}

// Aulas de 1 hora por semana, aproximado (mês ≈ 4,33 semanas). 12 → "~3 por semana".
export function aulasPorSemana(horasMensais: number): string {
  return `~${Math.max(1, Math.round(horasMensais / 4.33))} por semana`;
}

// Horas mensais → texto aproximado por semana (mês ≈ 4,33 semanas),
// arredondado para 15 min. Ex.: 12 h/mês → "~2h45/semana".
export function horasPorSemana(horasMensais: number): string {
  const quartos = Math.round((horasMensais / 4.33) * 4);
  const horas = Math.floor(quartos / 4);
  const minutos = (quartos % 4) * 15;
  return `~${horas}h${minutos ? String(minutos).padStart(2, "0") : ""}/semana`;
}
