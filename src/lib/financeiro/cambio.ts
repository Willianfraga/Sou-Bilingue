import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// Câmbio USD→BRL para converter custos de IA (cobrados em dólar). Fonte
// oficial: PTAX de venda do Banco Central (API pública Olinda, sem chave).
// Guarda a última cotação em billing_config como reserva. Nunca inventa taxa:
// sem cotação, devolve null e o painel mostra só o valor em dólar.

export type Cambio = { taxa: number; data: string; fonte: string; reserva: boolean };

let cache: { valor: Cambio; ate: number } | null = null;
const CHAVE = "cambio_usd_brl";

function dataAmericana(d: Date): string {
  return `${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}-${d.getUTCFullYear()}`;
}

async function buscarPtax(): Promise<Cambio | null> {
  const ate = new Date();
  const de = new Date(ate.getTime() - 10 * 24 * 60 * 60_000); // cobre fins de semana e feriados
  const url =
    "https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoDolarPeriodo(dataInicial=@dataInicial,dataFinalCotacao=@dataFinalCotacao)" +
    `?@dataInicial='${dataAmericana(de)}'&@dataFinalCotacao='${dataAmericana(ate)}'&$format=json&$orderby=dataHoraCotacao%20desc&$top=1`;
  const r = await fetch(url, { signal: AbortSignal.timeout(8_000), headers: { Accept: "application/json" } });
  if (!r.ok) return null;
  const j = (await r.json()) as { value?: Array<{ cotacaoVenda?: number; dataHoraCotacao?: string }> };
  const v = j.value?.[0];
  if (!v?.cotacaoVenda || !v.dataHoraCotacao) return null;
  return { taxa: v.cotacaoVenda, data: v.dataHoraCotacao.slice(0, 10), fonte: "PTAX venda — Banco Central do Brasil", reserva: false };
}

export async function getCambioUsdBrl(): Promise<Cambio | null> {
  if (cache && cache.ate > Date.now()) return cache.valor;
  const db = createSupabaseAdminClient();
  try {
    const atual = await buscarPtax();
    if (atual) {
      cache = { valor: atual, ate: Date.now() + 6 * 60 * 60_000 };
      await db
        .from("billing_config")
        .upsert({ chave: CHAVE, valor: JSON.stringify(atual), tipo: "json", descricao: "Última cotação PTAX (USD→BRL) usada no painel", atualizada_em: new Date().toISOString() }, { onConflict: "chave" });
      return atual;
    }
  } catch (e) {
    console.error("PTAX indisponível:", e instanceof Error ? e.message : e);
  }
  try {
    const { data } = await db.from("billing_config").select("valor").eq("chave", CHAVE).maybeSingle();
    if (data?.valor) {
      const salvo = JSON.parse(String(data.valor)) as Cambio;
      const valor = { ...salvo, reserva: true };
      cache = { valor, ate: Date.now() + 30 * 60_000 };
      return valor;
    }
  } catch {
    // sem reserva
  }
  return null;
}
