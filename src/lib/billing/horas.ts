// Regras puras das horas de conversa (Fase 3 — docs/fase3-horas.md).
// O banco (migration 0025) é quem decide o que conta; aqui ficam os números
// que o navegador usa e os textos mostrados ao aluno.

// O navegador manda o tempo ativo a cada 30 s; o servidor aceita no máximo
// 60 s por sinal e nunca mais que o tempo real desde o sinal anterior.
export const SINAL_A_CADA_MS = 30_000;
export const MAXIMO_POR_SINAL = 60;

export const PACOTES_DE_HORAS_EXTRAS = [5, 10, 20] as const;
export const PRECO_HORA_EXTRA_PADRAO = 9.9;

// Cobrança da aula: arredonda para o minuto mais próximo (o mesmo do banco).
export function minutosCobrados(segundosAtivos: number): number {
  return Math.round(Math.max(0, segundosAtivos) / 60);
}

// "2 h 15 min", "45 min", "0 min". Entrada em horas (numeric do banco).
export function formatarHoras(horas: number | string | null | undefined): string {
  const totalMin = Math.round(Math.max(0, Number(horas) || 0) * 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

export function precoDoPacote(horas: number, precoPorHora: number): number {
  return Math.round(horas * precoPorHora * 100) / 100;
}

export function formatarReais(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export type TipoDoExtrato = "plano" | "uso" | "recarga" | "reposicao" | "ajuste";

const ROTULOS: Record<TipoDoExtrato, string> = {
  plano: "Horas do plano",
  uso: "Aula",
  recarga: "Horas extras",
  reposicao: "Reposição",
  ajuste: "Ajuste",
};

export function rotuloDoExtrato(tipo: string): string {
  return ROTULOS[tipo as TipoDoExtrato] ?? "Lançamento";
}

// Segundos do extrato → "+10 h", "−25 min", "—" (zero: aula não cobrada).
export function valorDoExtrato(segundos: number): string {
  if (!segundos) return "—";
  const sinal = segundos > 0 ? "+" : "−";
  return `${sinal}${formatarHoras(Math.abs(segundos) / 3600)}`;
}
