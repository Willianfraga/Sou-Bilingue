import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PRECOS_PADRAO, calcularCusto, type PrecoIa } from "@/lib/ai/precos";

export type AIService = "llm" | "tts" | "stt";

export interface AIUsageInput {
  alunoId: string | null; // null = visitante (assistente da página de vendas)
  provider: "anthropic" | "elevenlabs";
  service: AIService;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  cacheCreationTokens?: number;
  cacheReadTokens?: number;
  characters?: number;
  audioSeconds?: number;
  tutorId?: string | null;
  conversaId?: string | null;
  mensagemId?: string | null;
  latenciaMs?: number;
  status?: "ok" | "erro";
  erro?: string;
  origem?: "aula" | "assistente_vendas" | "admin_teste";
  metadata?: Record<string, unknown>;
}

// Tabela de preços (precos_ia) em memória por 5 minutos; se o banco falhar,
// usa os valores padrão. Custo gravado é sempre ESTIMADO (custo_origem).
let cachePrecos: { tabela: PrecoIa[]; ate: number } | null = null;

export async function getTabelaDePrecos(): Promise<PrecoIa[]> {
  if (cachePrecos && cachePrecos.ate > Date.now()) return cachePrecos.tabela;
  try {
    const { data, error } = await createSupabaseAdminClient()
      .from("precos_ia")
      .select("provedor, modelo, unidade, preco, moeda, vigente_desde, fonte");
    if (error || !data?.length) throw new Error(error?.message ?? "tabela vazia");
    cachePrecos = { tabela: data as PrecoIa[], ate: Date.now() + 5 * 60_000 };
  } catch (e) {
    console.error("Preços de IA indisponíveis; usando os padrões:", e instanceof Error ? e.message : e);
    cachePrecos = { tabela: PRECOS_PADRAO, ate: Date.now() + 60_000 };
  }
  return cachePrecos.tabela;
}

// Compatibilidade: custo estimado com os preços padrão (número, em USD).
export function estimateCostUsd(input: Omit<AIUsageInput, "alunoId" | "metadata">) {
  return Number(calcularCusto(input, PRECOS_PADRAO).valor);
}

// Grava pelo servidor (service role): desde a migration 0020 o aluno não
// insere consumo direto no banco. Nunca derruba a aula.
export async function recordAIUsage(input: AIUsageInput) {
  try {
    const tabela = await getTabelaDePrecos();
    const custo = calcularCusto(input, tabela);
    const { error } = await createSupabaseAdminClient().from("ai_usage_events").insert({
      aluno_id: input.alunoId,
      provider: input.provider,
      service: input.service,
      model: input.model,
      input_tokens: input.inputTokens ?? 0,
      output_tokens: input.outputTokens ?? 0,
      cache_creation_input_tokens: input.cacheCreationTokens ?? 0,
      cache_read_input_tokens: input.cacheReadTokens ?? 0,
      characters: input.characters ?? 0,
      audio_seconds: input.audioSeconds ?? 0,
      estimated_cost_usd: custo.valor,
      tutor_id: input.tutorId ?? null,
      conversa_id: input.conversaId ?? null,
      mensagem_id: input.mensagemId ?? null,
      latencia_ms: input.latenciaMs ?? null,
      status: input.status ?? "ok",
      erro: input.erro ? input.erro.slice(0, 300) : null,
      origem: input.origem ?? "aula",
      custo_origem: "estimado",
      preco_referencia: { itens: custo.itens, semPreco: custo.semPreco },
      metadata: input.metadata ?? {},
    });
    if (error) console.error("Falha ao registrar consumo de IA:", error.message);
  } catch (error) {
    // Telemetria nunca pode derrubar a aula.
    console.error("Falha isolada na telemetria de IA:", error instanceof Error ? error.message : error);
  }
}

// Erro sem dados pessoais: só o tipo/código e o começo da mensagem.
export function resumoDoErro(erro: unknown): string {
  if (erro && typeof erro === "object" && "status" in erro) {
    const e = erro as { status?: number; message?: string };
    return `HTTP ${e.status ?? "?"}: ${(e.message ?? "").slice(0, 160)}`;
  }
  return (erro instanceof Error ? erro.message : String(erro)).slice(0, 200);
}
