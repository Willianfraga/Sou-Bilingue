// Parâmetros de campanha e eventos do funil de vendas. Módulo puro.
// Sem dados pessoais: só nome do evento, sessão anônima, página, plano e
// parâmetros de campanha (docs/sales-page.md → Analytics).

export const PARAMETROS_DE_CAMPANHA = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "src",
  "sck",
] as const;

export type ParametroDeCampanha = (typeof PARAMETROS_DE_CAMPANHA)[number];
export type Campanha = Partial<Record<ParametroDeCampanha, string>>;

export const EVENTOS_DO_FUNIL = [
  "pagina_vista",
  "cta_principal",
  "como_funciona",
  "planos_vistos",
  "plano_selecionado",
  "ida_ao_checkout",
  "compra_confirmada", // só o webhook grava este
] as const;

export type EventoDoFunil = (typeof EVENTOS_DO_FUNIL)[number];

export function eventoPermitido(nome: unknown): nome is EventoDoFunil {
  return typeof nome === "string" && (EVENTOS_DO_FUNIL as readonly string[]).includes(nome);
}

// Valor de parâmetro de campanha: curto e só caracteres seguros.
export function limparParametro(valor: unknown): string | undefined {
  if (typeof valor !== "string") return undefined;
  const limpo = valor.trim().slice(0, 100).replace(/[^\p{L}\p{N}_.\-+ ]/gu, "");
  return limpo || undefined;
}

export function extrairCampanha(parametros: URLSearchParams | Record<string, unknown>): Campanha {
  const ler = (k: string) =>
    parametros instanceof URLSearchParams ? parametros.get(k) : (parametros as Record<string, unknown>)[k];
  const campanha: Campanha = {};
  for (const chave of PARAMETROS_DE_CAMPANHA) {
    const valor = limparParametro(ler(chave));
    if (valor) campanha[chave] = valor;
  }
  return campanha;
}

// Leva os parâmetros de campanha para um link interno (cadastro, checkout),
// sem sobrescrever o que o link já tiver.
export function anexarCampanha(caminho: string, campanha: Campanha): string {
  const [base, query = ""] = caminho.split("?");
  const params = new URLSearchParams(query);
  for (const [chave, valor] of Object.entries(campanha)) {
    if (valor && !params.has(chave)) params.set(chave, valor);
  }
  const final = params.toString();
  return final ? `${base}?${final}` : base;
}

// Nomes de plano aceitos no link (?plano=). O preço nunca vem daqui.
export function planoValido(plano: unknown, existentes: string[]): string | undefined {
  return typeof plano === "string" && existentes.includes(plano) ? plano : undefined;
}
