-- Fase 1: endurecimento de segurança e idempotência financeira.
DROP POLICY IF EXISTS "system_all_subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "system_all_sessions" ON public.usage_sessions;
DROP POLICY IF EXISTS "system_all_ledger" ON public.usage_ledger;
DROP POLICY IF EXISTS "system_all_payments" ON public.payments;
DROP POLICY IF EXISTS "system_all_topups" ON public.hour_topups;
DROP POLICY IF EXISTS "system_all_topups_insert" ON public.hour_topups;
DROP POLICY IF EXISTS "system_all_topups_update" ON public.hour_topups;

CREATE TABLE IF NOT EXISTS public.webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), provider TEXT NOT NULL,
  event_id TEXT NOT NULL, event_type TEXT NOT NULL, payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'processando' CHECK (status IN ('processando', 'processado', 'erro')),
  process_error TEXT, recebido_em TIMESTAMPTZ NOT NULL DEFAULT now(), processado_em TIMESTAMPTZ,
  UNIQUE (provider, event_id)
);
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.usage_sessions ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ DEFAULT now();
CREATE UNIQUE INDEX IF NOT EXISTS usage_sessions_um_ativo_por_aluno
  ON public.usage_sessions (aluno_id) WHERE ativo = true;
ALTER TABLE public.hour_topups ADD COLUMN IF NOT EXISTS asaas_payment_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS hour_topups_asaas_payment_unique
  ON public.hour_topups (asaas_payment_id) WHERE asaas_payment_id IS NOT NULL;

INSERT INTO public.billing_config (chave, valor, tipo, descricao) VALUES
  ('heartbeat_sessao_segundos', '15', 'number', 'Intervalo do heartbeat da sessão ativa'),
  ('tolerancia_desconexao_segundos', '120', 'number', 'Tolerância antes do encerramento por desconexão')
ON CONFLICT (chave) DO NOTHING;
