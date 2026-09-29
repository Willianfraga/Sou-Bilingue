// Formatação dos números do painel (pt-BR). Módulo puro.
import type { Formato, Natureza } from "./indicadores";

const inteiro = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const decimal = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
const reais = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const dolares = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 4 });

export function formatarValor(valor: number | null, formato: Formato): string {
  if (valor === null || !Number.isFinite(valor)) return "—";
  switch (formato) {
    case "reais":
      return reais.format(valor);
    case "dolares":
      return dolares.format(valor);
    case "percentual":
      return `${decimal.format(valor)}%`;
    case "horas":
      return `${decimal.format(valor)} h`;
    case "minutos":
      return `${inteiro.format(valor)} min`;
    case "ms":
      return valor >= 1000 ? `${decimal.format(valor / 1000)} s` : `${inteiro.format(valor)} ms`;
    default:
      return Math.abs(valor) >= 10_000 ? new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(valor) : inteiro.format(valor);
  }
}

export function formatarVariacao(v: number | null): string {
  if (v === null) return "sem comparação";
  const sinal = v > 0 ? "+" : v < 0 ? "−" : "";
  return `${sinal}${decimal.format(Math.abs(v))}% vs. período anterior`;
}

// Boa, ruim ou neutra — considerando se menor é melhor (custo, erro).
export function tomDaVariacao(v: number | null, menorEhMelhor = false): "bom" | "ruim" | "neutro" {
  if (v === null || Math.abs(v) < 0.5) return "neutro";
  const subiu = v > 0;
  return subiu !== menorEhMelhor ? "bom" : "ruim";
}

export const ROTULO_NATUREZA: Record<Natureza, string> = {
  confirmado: "Confirmado",
  estimado: "Estimado",
  parcial: "Parcial",
  calculado: "Calculado",
};

export function formatarDataHora(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" }).format(new Date(iso));
}

export function formatarData(iso: string): string {
  const s = iso.slice(0, 10);
  const [a, m, d] = s.split("-");
  return `${d}/${m}/${a}`;
}
