// Custo de IA a partir da tabela precos_ia (migration 0020). Módulo puro,
// testado em test/admin.test.mjs. Conta em micro-dólares inteiros (BigInt):
// sem erro de ponto flutuante. Todo custo calculado aqui é ESTIMADO — o
// valor confirmado é a fatura do provedor (lançada em Custos).

export type UnidadePreco =
  | "mtok_entrada"
  | "mtok_saida"
  | "mtok_cache_escrita"
  | "mtok_cache_leitura"
  | "mil_caracteres"
  | "hora_audio";

export type PrecoIa = {
  provedor: string;
  modelo: string; // prefixo do nome do modelo
  unidade: UnidadePreco;
  preco: string | number; // por unidade (numeric(14,6) do banco)
  moeda: string;
  vigente_desde: string;
  fonte: string;
};

// Mesmos valores da carga inicial da migration 0020 — usados só se o banco
// não responder.
export const PRECOS_PADRAO: PrecoIa[] = [
  { provedor: "anthropic", modelo: "claude-haiku-4-5", unidade: "mtok_entrada", preco: "1.00", moeda: "USD", vigente_desde: "2025-10-01", fonte: "Tabela pública da Anthropic (Haiku 4.5)" },
  { provedor: "anthropic", modelo: "claude-haiku-4-5", unidade: "mtok_saida", preco: "5.00", moeda: "USD", vigente_desde: "2025-10-01", fonte: "Tabela pública da Anthropic (Haiku 4.5)" },
  { provedor: "anthropic", modelo: "claude-haiku-4-5", unidade: "mtok_cache_escrita", preco: "1.25", moeda: "USD", vigente_desde: "2025-10-01", fonte: "Tabela pública da Anthropic (Haiku 4.5, cache 5 min)" },
  { provedor: "anthropic", modelo: "claude-haiku-4-5", unidade: "mtok_cache_leitura", preco: "0.10", moeda: "USD", vigente_desde: "2025-10-01", fonte: "Tabela pública da Anthropic (Haiku 4.5)" },
  { provedor: "elevenlabs", modelo: "eleven_flash_v2_5", unidade: "mil_caracteres", preco: "0.05", moeda: "USD", vigente_desde: "2025-10-01", fonte: "Estimativa (docs/CUSTOS_IA.md)" },
  { provedor: "elevenlabs", modelo: "scribe_v2", unidade: "hora_audio", preco: "0.22", moeda: "USD", vigente_desde: "2025-10-01", fonte: "Estimativa (docs/CUSTOS_IA.md)" },
];

// "1.25" → 1.250.000 micro-unidades. Aceita até 6 casas, como o banco.
export function paraMicro(valor: string | number): bigint {
  const texto = typeof valor === "number" ? valor.toFixed(6) : valor.trim();
  const m = texto.match(/^(-?)(\d+)(?:\.(\d{0,6})\d*)?$/);
  if (!m) throw new Error(`Valor inválido: ${valor}`);
  const inteiro = BigInt(m[2]) * BigInt(1_000_000) + BigInt((m[3] ?? "").padEnd(6, "0") || "0");
  return m[1] ? -inteiro : inteiro;
}

// 1.234 micro → "0.001234"
export function microParaTexto(micro: bigint): string {
  const negativo = micro < BigInt(0);
  const abs = negativo ? -micro : micro;
  const texto = `${abs / BigInt(1_000_000)}.${(abs % BigInt(1_000_000)).toString().padStart(6, "0")}`;
  return negativo ? `-${texto}` : texto;
}

export function precoVigente(
  tabela: PrecoIa[],
  provedor: string,
  modelo: string,
  unidade: UnidadePreco,
  quando = new Date(),
): PrecoIa | undefined {
  return tabela
    .filter(
      (p) => p.provedor === provedor && p.unidade === unidade && modelo.startsWith(p.modelo) && new Date(p.vigente_desde).getTime() <= quando.getTime(),
    )
    .sort((a, b) => b.modelo.length - a.modelo.length || new Date(b.vigente_desde).getTime() - new Date(a.vigente_desde).getTime())[0];
}

export type Consumo = {
  provider: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  cacheCreationTokens?: number;
  cacheReadTokens?: number;
  characters?: number;
  audioSeconds?: number;
};

export type ItemDeCusto = { unidade: UnidadePreco; quantidade: number; preco: string; moeda: string; fonte: string; custo: string };
export type Custo = { valor: string; moeda: string; itens: ItemDeCusto[]; semPreco: UnidadePreco[] };

const DIVISOR: Record<UnidadePreco, bigint> = {
  mtok_entrada: BigInt(1_000_000),
  mtok_saida: BigInt(1_000_000),
  mtok_cache_escrita: BigInt(1_000_000),
  mtok_cache_leitura: BigInt(1_000_000),
  mil_caracteres: BigInt(1_000),
  hora_audio: BigInt(3_600),
};

// Divisão com arredondamento para o micro-dólar mais próximo.
const dividir = (a: bigint, b: bigint) => (a + b / BigInt(2)) / b;

export function calcularCusto(consumo: Consumo, tabela: PrecoIa[], quando = new Date()): Custo {
  const quantidades: Array<[UnidadePreco, number]> = [
    ["mtok_entrada", consumo.inputTokens ?? 0],
    ["mtok_saida", consumo.outputTokens ?? 0],
    ["mtok_cache_escrita", consumo.cacheCreationTokens ?? 0],
    ["mtok_cache_leitura", consumo.cacheReadTokens ?? 0],
    ["mil_caracteres", consumo.characters ?? 0],
    ["hora_audio", Math.round(consumo.audioSeconds ?? 0)],
  ];
  let total = BigInt(0);
  const itens: ItemDeCusto[] = [];
  const semPreco: UnidadePreco[] = [];
  let moeda = "USD";
  for (const [unidade, quantidade] of quantidades) {
    if (!quantidade || quantidade < 0) continue;
    const preco = precoVigente(tabela, consumo.provider, consumo.model, unidade, quando);
    if (!preco) {
      semPreco.push(unidade);
      continue;
    }
    moeda = preco.moeda;
    const custo = dividir(paraMicro(preco.preco) * BigInt(Math.trunc(quantidade)), DIVISOR[unidade]);
    total += custo;
    itens.push({ unidade, quantidade, preco: String(preco.preco), moeda: preco.moeda, fonte: preco.fonte, custo: microParaTexto(custo) });
  }
  return { valor: microParaTexto(total), moeda, itens, semPreco };
}
