-- Fase 2 — Rastreamento de Horas em Tempo Real
-- Data: 22 de agosto de 2026
-- Adiciona campos faltantes e políticas de RLS para sessions

-- ============================================================================
-- 1. Atualizar usage_sessions com campo atualizada_em
-- ============================================================================

ALTER TABLE public.usage_sessions
ADD COLUMN atualizada_em TIMESTAMPTZ DEFAULT now();

-- Trigger para atualizar atualizada_em automaticamente
CREATE OR REPLACE FUNCTION update_usage_sessions_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizada_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS usage_sessions_update_timestamp ON public.usage_sessions;
CREATE TRIGGER usage_sessions_update_timestamp
BEFORE UPDATE ON public.usage_sessions
FOR EACH ROW
EXECUTE FUNCTION update_usage_sessions_timestamp();

-- ============================================================================
-- 2. Adicionar índice composto para queries comuns
-- ============================================================================

CREATE INDEX idx_session_aluno_ativo ON public.usage_sessions(aluno_id, ativo)
WHERE ativo = true;

CREATE INDEX idx_session_subscription ON public.usage_sessions(subscription_id);

-- ============================================================================
-- 3. Adicionar função para auto-encerrar sessões inativas
-- ============================================================================

CREATE OR REPLACE FUNCTION close_idle_sessions(max_idle_seconds INT DEFAULT 3600)
RETURNS TABLE (
  session_id UUID,
  aluno_id UUID,
  segundos_encerrados INT
) AS $$
BEGIN
  RETURN QUERY
  UPDATE public.usage_sessions
  SET
    ativo = false,
    encerrada_em = now(),
    segundos_utilizados = EXTRACT(EPOCH FROM (now() - iniciada_em))::INT
  WHERE
    ativo = true
    AND (now() - atualizada_em) > (max_idle_seconds || ' seconds')::INTERVAL
  RETURNING
    id,
    aluno_id,
    segundos_utilizados;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 4. Adicionar função para calcular consumo de horas
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_hours_used(segundos INT)
RETURNS DECIMAL AS $$
BEGIN
  RETURN CEIL(segundos::DECIMAL / 3600);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 5. View para histórico de consumo consolidado
-- ============================================================================

CREATE OR REPLACE VIEW v_aluno_consumo_mes AS
SELECT
  s.aluno_id,
  sub.id as subscription_id,
  sub.ciclo_inicio,
  sub.ciclo_fim,
  sub.horas_total,
  sub.horas_utilizadas,
  sub.horas_restantes,
  COUNT(DISTINCT us.id) as total_sessoes,
  SUM(EXTRACT(EPOCH FROM (us.encerrada_em - us.iniciada_em)))::INT as segundos_totais,
  CEIL(SUM(EXTRACT(EPOCH FROM (us.encerrada_em - us.iniciada_em)))::DECIMAL / 3600) as horas_usadas_sessoes
FROM public.subscriptions sub
LEFT JOIN public.usage_sessions us ON us.subscription_id = sub.id
  AND us.ativo = false
  AND us.encerrada_em >= sub.ciclo_inicio
  AND us.encerrada_em <= sub.ciclo_fim
LEFT JOIN public.alunos s ON s.id = sub.aluno_id
WHERE sub.status = 'ativa'
GROUP BY s.aluno_id, sub.id, sub.ciclo_inicio, sub.ciclo_fim, sub.horas_total, sub.horas_utilizadas, sub.horas_restantes;

-- ============================================================================
-- 6. Adicionar RLS policies para alunos gerenciarem suas sessões
-- ============================================================================

CREATE POLICY "aluno_insert_sessions" ON public.usage_sessions
  FOR INSERT
  WITH CHECK (aluno_id = auth.uid());

CREATE POLICY "aluno_update_sessions" ON public.usage_sessions
  FOR UPDATE
  USING (aluno_id = auth.uid())
  WITH CHECK (aluno_id = auth.uid());

-- ============================================================================
-- 7. Adicionar configuração para timeout de sessão
-- ============================================================================

INSERT INTO public.billing_config (chave, valor, tipo, descricao)
VALUES ('max_idle_segundos_sessao', '3600', 'number', 'Máximo de segundos inativo antes de auto-encerrar (1h = 3600s)')
ON CONFLICT (chave) DO NOTHING;

-- ============================================================================
-- 8. Adicionar função para alertas de consumo
-- ============================================================================

CREATE OR REPLACE FUNCTION get_session_alerts(aluno_id UUID)
RETURNS TABLE (
  tipo TEXT,
  mensagem TEXT,
  horas_restantes DECIMAL,
  percentual_usado INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    CASE
      WHEN sub.horas_restantes <= 0 THEN 'exhausted'
      WHEN sub.horas_restantes < 1 THEN 'critical'
      WHEN sub.horas_restantes < 5 THEN 'warning'
      ELSE NULL
    END as tipo,
    CASE
      WHEN sub.horas_restantes <= 0 THEN 'Sua quota de horas acabou'
      WHEN sub.horas_restantes < 1 THEN 'Menos de 1 hora restante!'
      WHEN sub.horas_restantes < 5 THEN 'Aviso: Menos de 5 horas restantes'
      ELSE NULL
    END as mensagem,
    sub.horas_restantes,
    ROUND(((sub.horas_total - sub.horas_restantes)::DECIMAL / sub.horas_total) * 100)::INT as percentual_usado
  FROM public.subscriptions sub
  WHERE sub.aluno_id = $1 AND sub.status = 'ativa';
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 9. Índices adicionais para performance
-- ============================================================================

CREATE INDEX idx_ledger_aluno_data ON public.usage_ledger(aluno_id, criada_em DESC);
CREATE INDEX idx_subscription_aluno_status ON public.subscriptions(aluno_id, status);

COMMENT ON FUNCTION close_idle_sessions IS 'Auto-encerra sessões inativas. Chamada pelo n8n a cada 15 minutos.';
COMMENT ON VIEW v_aluno_consumo_mes IS 'Consolidado de consumo mensal por aluno (sessões + horas).';
