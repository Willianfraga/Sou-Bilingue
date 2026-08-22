"use client";

import { useEffect, useState } from "react";
import { getConsumoMesAction, getEstatisticasGeraisAction, getTendenciasAction } from "@/app/aluno/dashboard/actions";

interface ConsumoData {
  mes: string;
  horas_total: number;
  horas_utilizadas: number;
  horas_restantes: number;
  percentual_usado: number;
  sessoes_total: number;
  duracao_media_minutos: number;
}

interface EstatisticasData {
  total_horas_compradas: number;
  total_horas_usadas: number;
  total_gasto: number;
  sessoes_lifetime: number;
  dias_como_membro: number;
}

interface Tendencia {
  data: string;
  horas_usadas: number;
  sessoes: number;
}

export function ConsumoDashboard() {
  const [consumo, setConsumo] = useState<ConsumoData | null>(null);
  const [stats, setStats] = useState<EstatisticasData | null>(null);
  const [tendencias, setTendencias] = useState<Tendencia[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const [consumoRes, statsRes, tendenciasRes] = await Promise.all([
        getConsumoMesAction(),
        getEstatisticasGeraisAction(),
        getTendenciasAction(),
      ]);

      if (consumoRes.success && consumoRes.consumo) {
        setConsumo(consumoRes.consumo);
      }
      if (statsRes.success && statsRes.stats) {
        setStats(statsRes.stats);
      }
      if (tendenciasRes.success && tendenciasRes.tendencias) {
        setTendencias(tendenciasRes.tendencias);
      }
      setLoading(false);
    }

    loadData();
  }, []);

  if (loading) {
    return <div className="text-center py-12">Carregando dashboard...</div>;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-neutral-900">Seu Consumo</h1>
        <p className="text-neutral-600 mt-2">
          Acompanhe suas horas de conversação e investimento
        </p>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Horas Compradas */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-3xl font-bold text-blue-600">
            {stats?.total_horas_compradas || 0}h
          </div>
          <div className="text-sm text-blue-900 mt-1">Horas compradas</div>
        </div>

        {/* Total Horas Usadas */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-3xl font-bold text-green-600">
            {stats?.total_horas_usadas || 0}h
          </div>
          <div className="text-sm text-green-900 mt-1">Horas usadas</div>
        </div>

        {/* Sessões */}
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="text-3xl font-bold text-purple-600">
            {stats?.sessoes_lifetime || 0}
          </div>
          <div className="text-sm text-purple-900 mt-1">Sessões totais</div>
        </div>

        {/* Total Gasto */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="text-3xl font-bold text-amber-600">
            R$ {stats?.total_gasto.toFixed(2) || "0.00"}
          </div>
          <div className="text-sm text-amber-900 mt-1">Investimento</div>
        </div>
      </div>

      {/* Consumo do Mês */}
      {consumo && (
        <div className="bg-white border border-neutral-200 rounded-lg p-6">
          <h2 className="text-xl font-bold text-neutral-900 mb-6">
            Mês Atual — {new Date(consumo.mes + "-01").toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
          </h2>

          <div className="space-y-6">
            {/* Barra de Progresso */}
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-semibold text-neutral-900">
                  {consumo.horas_utilizadas}h de {consumo.horas_total}h
                </span>
                <span className="text-sm font-semibold text-neutral-600">
                  {consumo.percentual_usado}%
                </span>
              </div>
              <div className="w-full bg-neutral-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all ${
                    consumo.percentual_usado > 90
                      ? "bg-red-500"
                      : consumo.percentual_usado > 75
                      ? "bg-yellow-500"
                      : "bg-green-500"
                  }`}
                  style={{ width: `${consumo.percentual_usado}%` }}
                />
              </div>
            </div>

            {/* Resumo */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-neutral-200">
              <div>
                <div className="text-sm text-neutral-600">Sessões</div>
                <div className="text-2xl font-bold text-neutral-900">
                  {consumo.sessoes_total}
                </div>
              </div>
              <div>
                <div className="text-sm text-neutral-600">Duração Média</div>
                <div className="text-2xl font-bold text-neutral-900">
                  {consumo.duracao_media_minutos}min
                </div>
              </div>
              <div>
                <div className="text-sm text-neutral-600">Restantes</div>
                <div className="text-2xl font-bold text-blue-600">
                  {consumo.horas_restantes}h
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Gráfico de Tendências (simples) */}
      {tendencias.length > 0 && (
        <div className="bg-white border border-neutral-200 rounded-lg p-6">
          <h2 className="text-xl font-bold text-neutral-900 mb-6">
            Últimos 7 dias
          </h2>

          <div className="space-y-4">
            {tendencias.map((t) => (
              <div key={t.data}>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-semibold text-neutral-900">
                    {new Date(t.data + "T00:00:00").toLocaleDateString("pt-BR", {
                      weekday: "short",
                      day: "numeric",
                      month: "numeric",
                    })}
                  </span>
                  <span className="text-sm text-neutral-600">
                    {t.horas_usadas}h ({t.sessoes} sessões)
                  </span>
                </div>
                <div className="w-full bg-neutral-200 rounded-full h-2">
                  <div
                    className="h-2 rounded-full bg-blue-500"
                    style={{ width: `${Math.min(t.horas_usadas * 10, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          📊 <strong>Dica:</strong> Seus dados são atualizados em tempo real. Você pode
          acompanhar seu consumo mês a mês e planejar recargas de horas conforme necessário.
        </p>
      </div>
    </div>
  );
}
