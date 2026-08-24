import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AIService = "llm" | "tts" | "stt";

export interface AIUsageInput {
  alunoId: string;
  provider: "anthropic" | "elevenlabs";
  service: AIService;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  cacheCreationTokens?: number;
  cacheReadTokens?: number;
  characters?: number;
  audioSeconds?: number;
  metadata?: Record<string, unknown>;
}

// Valores iniciais conservadores e editáveis no banco. O painel sempre os
// apresenta como estimativa; a fatura do provedor continua sendo a fonte final.
const DEFAULT_PRICES = {
  claudeInputPerMillion: 1,
  claudeOutputPerMillion: 5,
  claudeCacheWritePerMillion: 1.25,
  claudeCacheReadPerMillion: 0.1,
  ttsPerThousandCharacters: 0.05,
  sttPerHour: 0.22,
};

export function estimateCostUsd(input: Omit<AIUsageInput, "alunoId" | "metadata">) {
  if (input.service === "llm") {
    return (
      ((input.inputTokens ?? 0) / 1_000_000) * DEFAULT_PRICES.claudeInputPerMillion +
      ((input.outputTokens ?? 0) / 1_000_000) * DEFAULT_PRICES.claudeOutputPerMillion +
      ((input.cacheCreationTokens ?? 0) / 1_000_000) * DEFAULT_PRICES.claudeCacheWritePerMillion +
      ((input.cacheReadTokens ?? 0) / 1_000_000) * DEFAULT_PRICES.claudeCacheReadPerMillion
    );
  }
  if (input.service === "tts") {
    return ((input.characters ?? 0) / 1_000) * DEFAULT_PRICES.ttsPerThousandCharacters;
  }
  return ((input.audioSeconds ?? 0) / 3_600) * DEFAULT_PRICES.sttPerHour;
}

export async function recordAIUsage(input: AIUsageInput) {
  try {
    const supabase = await createSupabaseServerClient();
    const estimatedCostUsd = estimateCostUsd(input);
    const { error } = await (supabase.from("ai_usage_events") as any).insert({
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
      estimated_cost_usd: estimatedCostUsd,
      metadata: input.metadata ?? {},
    });
    if (error) console.error("Falha ao registrar consumo de IA:", error.message);
  } catch (error) {
    // Telemetria nunca pode derrubar a aula.
    console.error("Falha isolada na telemetria de IA:", error);
  }
}

export interface AIUsageDashboard {
  periodDays: number;
  totals: {
    inputTokens: number;
    outputTokens: number;
    cacheTokens: number;
    characters: number;
    audioMinutes: number;
    calls: number;
    costUsd: number;
  };
  byService: Array<{ service: AIService; calls: number; costUsd: number }>;
  daily: Array<{ date: string; calls: number; tokens: number; costUsd: number }>;
}

export async function getAIUsageDashboard(periodDays: number): Promise<AIUsageDashboard> {
  const days = [7, 30, 90].includes(periodDays) ? periodDays : 30;
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - days + 1);
  since.setUTCHours(0, 0, 0, 0);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await (supabase.from("ai_usage_events") as any)
    .select("service,input_tokens,output_tokens,cache_creation_input_tokens,cache_read_input_tokens,characters,audio_seconds,estimated_cost_usd,created_at")
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as any[];
  const services: Record<AIService, { calls: number; costUsd: number }> = {
    llm: { calls: 0, costUsd: 0 }, tts: { calls: 0, costUsd: 0 }, stt: { calls: 0, costUsd: 0 },
  };
  const daily = new Map<string, { calls: number; tokens: number; costUsd: number }>();
  const totals = { inputTokens: 0, outputTokens: 0, cacheTokens: 0, characters: 0, audioMinutes: 0, calls: rows.length, costUsd: 0 };
  for (const row of rows) {
    const service = row.service as AIService;
    const cost = Number(row.estimated_cost_usd ?? 0);
    const tokens = Number(row.input_tokens ?? 0) + Number(row.output_tokens ?? 0);
    totals.inputTokens += Number(row.input_tokens ?? 0);
    totals.outputTokens += Number(row.output_tokens ?? 0);
    totals.cacheTokens += Number(row.cache_creation_input_tokens ?? 0) + Number(row.cache_read_input_tokens ?? 0);
    totals.characters += Number(row.characters ?? 0);
    totals.audioMinutes += Number(row.audio_seconds ?? 0) / 60;
    totals.costUsd += cost;
    if (services[service]) { services[service].calls += 1; services[service].costUsd += cost; }
    const date = String(row.created_at).slice(0, 10);
    const day = daily.get(date) ?? { calls: 0, tokens: 0, costUsd: 0 };
    day.calls += 1; day.tokens += tokens; day.costUsd += cost; daily.set(date, day);
  }
  return {
    periodDays: days,
    totals,
    byService: (Object.entries(services) as Array<[AIService, { calls: number; costUsd: number }]>).map(([service, value]) => ({ service, ...value })),
    daily: Array.from(daily, ([date, value]) => ({ date, ...value })),
  };
}
