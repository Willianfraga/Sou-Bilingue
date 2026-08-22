-- Subscriptions & Payments — Fase 1 do SouBilingue
-- Data: 22 de agosto de 2026
-- Implementa: Planos, assinaturas, pagamentos, controle de horas

-- ============================================================================
-- 1. Planos disponíveis
-- ============================================================================

CREATE TABLE public.planos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE, -- 'essencial' | 'fluencia' | 'premium'
  preco DECIMAL(10,2) NOT NULL, -- R$ por mês
  horas_mensais INT NOT NULL, -- Quantidade de horas incluídas
  descricao TEXT,
  ativo BOOLEAN DEFAULT true,
  ordem INT DEFAULT 0,
  criado_em TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.planos IS 'Planos disponíveis (Essencial, Fluência, Premium)';

INSERT INTO public.planos (nome, preco, horas_mensais, descricao, ordem) VALUES
  ('essencial', 49.90, 12, 'Plano básico com 12 horas de conversação por mês', 1),
  ('fluencia', 99.90, 20, 'Plano intermediário com 20 horas de conversação por mês', 2),
  ('premium', 159.90, 30, 'Plano avançado com 30 horas de conversação por mês', 3),
  ('teste_7dias', 9.90, 5, 'Teste de 7 dias com 5 horas limitadas', 0)
ON CONFLICT (nome) DO NOTHING;

-- ============================================================================
-- 2. Assinaturas dos alunos
-- ============================================================================

CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id UUID NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  plano_id UUID NOT NULL REFERENCES public.planos(id),
  status TEXT NOT NULL DEFAULT 'ativa', -- 'ativa' | 'paused' | 'cancelada'

  -- Ciclo da assinatura
  ciclo_inicio DATE NOT NULL,
  ciclo_fim DATE NOT NULL,
  proxima_renovacao DATE,

  -- Horas deste ciclo
  horas_total INT NOT NULL,
  horas_utilizadas INT DEFAULT 0,
  horas_restantes INT GENERATED ALWAYS AS (horas_total - horas_utilizadas) STORED,

  -- Referência no Asaas
  asaas_subscription_id VARCHAR,
  asaas_customer_id VARCHAR,

  -- Auditoria
  criada_em TIMESTAMPTZ DEFAULT now(),
  renovada_em TIMESTAMPTZ,
  cancelada_em TIMESTAMPTZ,
  atualizada_em TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.subscriptions IS 'Assinaturas ativas dos alunos com controle de horas';

CREATE INDEX idx_sub_aluno ON public.subscriptions(aluno_id);
CREATE INDEX idx_sub_status ON public.subscriptions(status);
CREATE INDEX idx_sub_ciclo ON public.subscriptions(ciclo_inicio, ciclo_fim);

-- ============================================================================
-- 3. Sessões de uso (tracking em tempo real)
-- ============================================================================

CREATE TABLE public.usage_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id UUID NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,

  -- Timestamps
  iniciada_em TIMESTAMPTZ DEFAULT now(),
  encerrada_em TIMESTAMPTZ,
  atualizada_em TIMESTAMPTZ DEFAULT now(),

  -- Consumo
  segundos_utilizados INT DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  tipo VARCHAR DEFAULT 'conversa', -- 'conversa' | 'teste_gratuito' | 'teste_pago'

  -- Metadata
  ip_address INET,
  user_agent TEXT
);

COMMENT ON TABLE public.usage_sessions IS 'Sessões ativas de uso com controle de timeout e consumo';

CREATE INDEX idx_session_aluno ON public.usage_sessions(aluno_id);
CREATE INDEX idx_session_ativo ON public.usage_sessions(ativo);
CREATE INDEX idx_session_data ON public.usage_sessions(iniciada_em);

-- ============================================================================
-- 4. Ledger de horas (histórico de consumo)
-- ============================================================================

CREATE TABLE public.usage_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id UUID NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,

  tipo VARCHAR NOT NULL, -- 'uso' | 'recarga' | 'compensacao' | 'renovacao' | 'bonus'
  segundos INT NOT NULL,
  horas_totais DECIMAL(5,2) GENERATED ALWAYS AS (segundos::DECIMAL / 3600) STORED,

  descricao TEXT,
  referencia_externa VARCHAR, -- payment_id, session_id, etc

  criada_em TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.usage_ledger IS 'Histórico detalhado de consumo e créditos de horas';

CREATE INDEX idx_ledger_aluno ON public.usage_ledger(aluno_id);
CREATE INDEX idx_ledger_tipo ON public.usage_ledger(tipo);
CREATE INDEX idx_ledger_data ON public.usage_ledger(criada_em);

-- ============================================================================
-- 5. Pagamentos e Faturas
-- ============================================================================

CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id UUID NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,

  tipo VARCHAR NOT NULL, -- 'assinatura' | 'recarga' | 'compensacao'
  valor DECIMAL(10,2) NOT NULL,
  status VARCHAR NOT NULL DEFAULT 'pendente', -- 'pendente' | 'processando' | 'pago' | 'recusado' | 'cancelado'

  -- Asaas
  asaas_payment_id VARCHAR UNIQUE,
  asaas_invoice_id VARCHAR,

  -- Data de vencimento
  data_vencimento DATE,
  data_pagamento DATE,

  metodo_pagamento VARCHAR, -- 'pix' | 'cartao' | 'boleto'

  -- Auditoria
  criada_em TIMESTAMPTZ DEFAULT now(),
  atualizada_em TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.payments IS 'Registro de todos os pagamentos e cobranças';

CREATE INDEX idx_payment_aluno ON public.payments(aluno_id);
CREATE INDEX idx_payment_status ON public.payments(status);
CREATE INDEX idx_payment_asaas ON public.payments(asaas_payment_id);
CREATE INDEX idx_payment_data ON public.payments(criada_em);

-- ============================================================================
-- 6. Recargas de horas (compra de horas extras)
-- ============================================================================

CREATE TABLE public.hour_topups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id UUID NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,

  horas INT NOT NULL, -- Quantidade de horas compradas
  valor DECIMAL(10,2) NOT NULL, -- Valor pago
  valor_unitario DECIMAL(10,2) NOT NULL, -- Valor por hora (configurável)

  payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  status VARCHAR DEFAULT 'ativa', -- 'ativa' | 'utilizada' | 'expirada'

  -- Horas dessa recarga podem expirar (opcional)
  expira_em DATE,

  criada_em TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.hour_topups IS 'Compra de horas extras/recargas';

CREATE INDEX idx_topup_aluno ON public.hour_topups(aluno_id);
CREATE INDEX idx_topup_status ON public.hour_topups(status);

-- ============================================================================
-- 7. Configurações de negócio (ajustável pelo admin)
-- ============================================================================

CREATE TABLE public.billing_config (
  id SERIAL PRIMARY KEY,
  chave VARCHAR UNIQUE NOT NULL,
  valor TEXT NOT NULL,
  tipo VARCHAR DEFAULT 'text', -- 'text' | 'number' | 'boolean' | 'decimal'
  descricao TEXT,
  atualizada_em TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.billing_config IS 'Configurações de preços e planos';

INSERT INTO public.billing_config (chave, valor, tipo, descricao) VALUES
  ('preco_recarga_por_hora', '9.90', 'decimal', 'Preço por hora em recargas'),
  ('timeout_sessao_segundos', '3600', 'number', 'Timeout de sessão inativa (1h = 3600s)'),
  ('duracao_teste_gratuito_segundos', '300', 'number', 'Duração do teste gratuito (5 min = 300s)'),
  ('duracao_teste_pago_dias', '7', 'number', 'Duração do teste de R$9.90'),
  ('alerta_90_porcento', 'true', 'boolean', 'Enviar alerta em 90% de uso'),
  ('alerta_15_minutos', 'true', 'boolean', 'Enviar alerta com 15 min de saldo')
ON CONFLICT (chave) DO NOTHING;

-- ============================================================================
-- 8. RLS Policies
-- ============================================================================

ALTER TABLE public.planos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hour_topups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_config ENABLE ROW LEVEL SECURITY;

-- Aluno pode ver apenas seus dados
CREATE POLICY "aluno_read_subscriptions" ON public.subscriptions
  FOR SELECT USING (aluno_id = auth.uid());

CREATE POLICY "aluno_read_sessions" ON public.usage_sessions
  FOR SELECT USING (aluno_id = auth.uid());

CREATE POLICY "aluno_read_ledger" ON public.usage_ledger
  FOR SELECT USING (aluno_id = auth.uid());

CREATE POLICY "aluno_read_payments" ON public.payments
  FOR SELECT USING (aluno_id = auth.uid());

CREATE POLICY "aluno_read_topups" ON public.hour_topups
  FOR SELECT USING (aluno_id = auth.uid());

-- Sistema pode inserir/atualizar (via service role)
CREATE POLICY "system_all_subscriptions" ON public.subscriptions
  FOR ALL USING (true)
  WITH CHECK (true);

CREATE POLICY "system_all_sessions" ON public.usage_sessions
  FOR ALL USING (true)
  WITH CHECK (true);

CREATE POLICY "system_all_ledger" ON public.usage_ledger
  FOR ALL USING (true)
  WITH CHECK (true);

CREATE POLICY "system_all_payments" ON public.payments
  FOR ALL USING (true)
  WITH CHECK (true);

CREATE POLICY "system_all_topups" ON public.hour_topups
  FOR ALL USING (true)
  WITH CHECK (true);

-- Planos públicos
CREATE POLICY "public_read_planos" ON public.planos
  FOR SELECT USING (ativo = true);
