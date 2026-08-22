-- Fase 2.3 — Recargas de Horas (Hour Topups)
-- Data: 22 de agosto de 2026
-- Implementa compra de horas extras via Asaas

-- ============================================================================
-- 1. Atualizar hour_topups com campos necessários
-- ============================================================================

-- Se a coluna asaas_invoice_id não existir, adicionar
ALTER TABLE public.hour_topups
ADD COLUMN IF NOT EXISTS asaas_invoice_id VARCHAR;

-- Adicionar índice para buscar por invoice
CREATE INDEX IF NOT EXISTS idx_topup_asaas_invoice ON public.hour_topups(asaas_invoice_id);

-- ============================================================================
-- 2. RLS Policies para hour_topups
-- ============================================================================

-- Aluno pode ver seus topups
CREATE POLICY IF NOT EXISTS "aluno_read_topups" ON public.hour_topups
  FOR SELECT USING (aluno_id = auth.uid());

-- Sistema pode inserir/atualizar (via service role)
CREATE POLICY IF NOT EXISTS "system_all_topups_insert" ON public.hour_topups
  FOR INSERT WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "system_all_topups_update" ON public.hour_topups
  FOR UPDATE USING (true);

-- ============================================================================
-- 3. Função para processar topup confirmado
-- ============================================================================

CREATE OR REPLACE FUNCTION process_topup_payment(
  p_topup_id UUID,
  p_payment_id VARCHAR
)
RETURNS TABLE (success BOOLEAN, message TEXT) AS $$
DECLARE
  v_topup hour_topups%ROWTYPE;
  v_subscription_id UUID;
BEGIN
  -- Buscar topup
  SELECT * INTO v_topup FROM public.hour_topups WHERE id = p_topup_id;

  IF v_topup.id IS NULL THEN
    RETURN QUERY SELECT false, 'Topup não encontrado'::TEXT;
    RETURN;
  END IF;

  -- Atualizar topup para ativa
  UPDATE public.hour_topups
  SET
    status = 'ativa',
    payment_id = p_payment_id
  WHERE id = p_topup_id;

  -- Registrar no ledger (adição de horas)
  INSERT INTO public.usage_ledger (
    aluno_id,
    subscription_id,
    tipo,
    segundos,
    descricao,
    referencia_externa
  ) VALUES (
    v_topup.aluno_id,
    v_topup.subscription_id,
    'recarga',
    v_topup.horas * 3600,
    'Recarga de ' || v_topup.horas || 'h (R$ ' || v_topup.valor || ')',
    p_topup_id::VARCHAR
  );

  -- Retornar sucesso
  RETURN QUERY SELECT true, 'Topup processado com sucesso'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 4. Função para expirar topups antigos
-- ============================================================================

CREATE OR REPLACE FUNCTION expire_old_topups()
RETURNS TABLE (
  expired_count INT,
  message TEXT
) AS $$
DECLARE
  v_count INT;
BEGIN
  UPDATE public.hour_topups
  SET status = 'expirada'
  WHERE
    status = 'ativa'
    AND expira_em IS NOT NULL
    AND expira_em < CURRENT_DATE
    AND status != 'utilizada';

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN QUERY SELECT v_count, 'Topups expirados: ' || v_count || ''::TEXT;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 5. View para resumo de topups ativos
-- ============================================================================

CREATE OR REPLACE VIEW v_aluno_topups_ativos AS
SELECT
  ht.aluno_id,
  ht.subscription_id,
  COUNT(*) as total_topups_ativos,
  SUM(ht.horas) as horas_totais_disponiveis,
  SUM(ht.valor) as valor_total_investido,
  MAX(ht.criada_em) as ultimo_topup,
  MIN(ht.expira_em) as primeira_expiracao
FROM public.hour_topups ht
WHERE ht.status = 'ativa'
GROUP BY ht.aluno_id, ht.subscription_id;

-- ============================================================================
-- 6. Adicionar configuração para preço de topup
-- ============================================================================

INSERT INTO public.billing_config (chave, valor, tipo, descricao)
VALUES ('preco_recarga_por_hora', '9.90', 'decimal', 'Preço por hora em recargas de topup')
ON CONFLICT (chave) DO NOTHING;

-- ============================================================================
-- 7. Índices para performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_topup_aluno_data ON public.hour_topups(aluno_id, criada_em DESC);
CREATE INDEX IF NOT EXISTS idx_topup_status_expira ON public.hour_topups(status, expira_em)
WHERE status = 'ativa';

-- ============================================================================
-- 8. Comentários
-- ============================================================================

COMMENT ON FUNCTION process_topup_payment IS 'Processa pagamento de topup: atualiza status e registra ledger';
COMMENT ON FUNCTION expire_old_topups IS 'Auto-expira topups fora da validade. Chamada pelo n8n diariamente.';
COMMENT ON VIEW v_aluno_topups_ativos IS 'Resumo de topups ativos por aluno (total, horas, gasto).';
