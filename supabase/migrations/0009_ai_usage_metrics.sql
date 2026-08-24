-- Telemetria financeira dos serviços de IA. Registra somente unidades de
-- consumo e estimativa de custo, nunca áudio, texto da conversa ou segredos.
create table if not exists public.ai_usage_events (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.alunos (id) on delete cascade,
  provider text not null check (provider in ('anthropic', 'elevenlabs')),
  service text not null check (service in ('llm', 'tts', 'stt')),
  model text not null,
  input_tokens bigint not null default 0 check (input_tokens >= 0),
  output_tokens bigint not null default 0 check (output_tokens >= 0),
  cache_creation_input_tokens bigint not null default 0 check (cache_creation_input_tokens >= 0),
  cache_read_input_tokens bigint not null default 0 check (cache_read_input_tokens >= 0),
  characters bigint not null default 0 check (characters >= 0),
  audio_seconds numeric(12,3) not null default 0 check (audio_seconds >= 0),
  estimated_cost_usd numeric(14,8) not null default 0 check (estimated_cost_usd >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_ai_usage_events_created_at on public.ai_usage_events (created_at desc);
create index if not exists idx_ai_usage_events_aluno on public.ai_usage_events (aluno_id, created_at desc);
create index if not exists idx_ai_usage_events_service on public.ai_usage_events (service, created_at desc);

alter table public.ai_usage_events enable row level security;

create policy "aluno registra o proprio consumo de ia"
  on public.ai_usage_events for insert
  with check (auth.uid() = aluno_id or app.is_admin());

create policy "administrador consulta consumo de ia"
  on public.ai_usage_events for select
  using (app.is_admin());

comment on table public.ai_usage_events is
  'Unidades faturáveis e custo estimado de LLM, TTS e STT; não armazena conteúdo das conversas.';
