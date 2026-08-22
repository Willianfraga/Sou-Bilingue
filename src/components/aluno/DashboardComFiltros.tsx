"use client";

import { useEffect, useState } from "react";
import { FiltrosPeriodicidade, type Periodicidade } from "./FiltrosPeriodicidade";
import {
  getConsumoComPeriodoAction,
  getComparativoMesesAction,
  getTendenciasComPeriodoAction,
  getTaxaCrescimentoAction,
} from "@/app/aluno/dashboard/actions-advanced";
import { Line, Bar } from "react-chartjs-2";
import { ChartOptions } from "chart.js";

interface ConsumoComPeriodo {
  periodo: Periodicidade;
  horas_total: number;
  horas_utilizadas: number;
  horas_restantes: number;
  percentual_usado: number;
  sessoes_total: number;
  duracao_media_minutos: number;
}

interface ComparativoMeses {
  mes: string;
  horas_usadas: number;
  sessoes: number;
}

interface Tendencia {
  data: string;
  horas_usadas: number;
  sessoes: number;
}

interface TaxaCrescimento {
  percentual: number;
  tendencia: "crescimento" | "declinio" | "estavel";
}

export function DashboardComFiltros() {
  const [periodico, setPeriodico] = useState<Periodicidade>("mes");
  const [consumo, setConsumo] = useState<ConsumoComPeriodo | null>(null);
  const [comparativo, setComparativo] = useState<ComparativoMeses[]>([]);
  const [tendencias, setTendencias] = useState<Tendencia[]>([]);
  const [taxa, setTaxa] = useState<TaxaCrescimento | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [consumoRes, comparativoRes, tendenciasRes, taxaRes] = await Promise.all([
          getConsumoComPeriodoAction(periodico),
          getComparativoMesesAction(),
          getTendenciasComPeriodoAction(periodico),
          getTaxaCrescimentoAction(periodico),
        ]);

        if (consumoRes.success && consumoRes.data) {
          setConsumo(consumoRes.data);
        }
        if (comparativoRes.success && comparativoRes.data) {
          setComparativo(comparativoRes.data);
        }
        if (tendenciasRes.success && tendenciasRes.data) {
          setTendencias(tendenciasRes.data);
        }
        if (taxaRes.success && taxaRes.data) {
          setTaxa(taxaRes.data);
        }
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [periodico]);

  if (loading) {
    return <div className="text-center py-12">Carregando dashboard...</div>;
  }

  // Gráfico de Comparativo Meses
  const comparativoLabels = comparativo.map((c) => c.mes);
  const comparativoData = {
    labels: comparativoLabels,
    datasets: [
      {
        label: "Horas usadas",
        data: comparativo.map((c) => c.horas_usadas),
        borderColor: "#3b82f6",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: "#3b82f6",
      },
    ],
  };

  const comparativoOptions: ChartOptions<"line"> = {
    responsive: true,
    plugins: {
      legend: {
        position: "top",
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  // Gráfico de Tendências
  const tendenciasLabels = tendencias.map((t) => {
    const data = new Date(t.data + "T00:00:00");
    return data.toLocaleDateString("pt-BR", { day: "numeric", month: "short" });
  });

  const tendenciasData = {
    labels: tendenciasLabels,
    datasets: [
      {
        label: "Horas usadas",
        data: tendencias.map((t) => t.horas_usadas),
        backgroundColor: "#10b981",
        borderColor: "#047857",
        borderWidth: 1,
      },
    ],
  };

  const tendenciasOptions: ChartOptions<"bar"> = {
    responsive: true,
    plugins: {
      legend: {
        position: "top",
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  const getTaxaColor = () => {
    if (!taxa) return "text-neutral-600";
    switch (taxa.tendencia) {
      case "crescimento":
        return "text-green-600";
      case "declinio":
        return "text-red-600";
      case "estavel":
        return "text-blue-600";
    }
  };

  const getTaxaLabel = () => {
    if (!taxa) return "";
    switch (taxa.tendencia) {
      case "crescimento":
        return "📈 Crescimento";
      case "declinio":
        return "📉 Declínio";
      case "estavel":
        return "➡️ Estável";
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-neutral-900">Análise Detalhada</h2>
        <p className="text-neutral-600 mt-1">
          Compare períodos e veja suas tendências de consumo
        </p>
      </div>

      {/* Filtro de Período */}
      <FiltrosPeriodicidade current={periodico} onFilterChange={setPeriodico} />

      {/* Cards de Estatísticas do Período */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Horas Utilizadas */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-sm text-blue-900 font-semibold">Horas Utilizadas</div>
          <div className="text-3xl font-bold text-blue-600 mt-2">
            {consumo?.horas_utilizadas || 0}h
          </div>
          <div className="text-xs text-blue-700 mt-2">
            de {consumo?.horas_total || 0}h disponíveis
          </div>
        </div>

        {/* Percentual de Uso */}
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="text-sm text-purple-900 font-semibold">Percentual</div>
          <div className="text-3xl font-bold text-purple-600 mt-2">
            {consumo?.percentual_usado || 0}%
          </div>
          <div className="text-xs text-purple-700 mt-2">do período</div>
        </div>

        {/* Sessões */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-sm text-green-900 font-semibold">Sessões</div>
          <div className="text-3xl font-bold text-green-600 mt-2">
            {consumo?.sessoes_total || 0}
          </div>
          <div className="text-xs text-green-700 mt-2">
            Média: {consumo?.duracao_media_minutos || 0}min
          </div>
        </div>

        {/* Taxa de Crescimento */}
        <div className={`bg-orange-50 border border-orange-200 rounded-lg p-4`}>
          <div className="text-sm text-orange-900 font-semibold">Taxa</div>
          <div className={`text-3xl font-bold mt-2 ${getTaxaColor()}`}>
            {taxa?.percentual || 0}%
          </div>
          <div className={`text-xs mt-2 ${getTaxaColor()}`}>
            {getTaxaLabel()}
          </div>
        </div>
      </div>

      {/* Gráficos em Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Tendências do Período */}
        {tendencias.length > 0 && (
          <div className="bg-white border border-neutral-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-neutral-900 mb-6">
              Horas por Dia
            </h3>
            <Bar data={tendenciasData} options={tendenciasOptions} />
          </div>
        )}

        {/* Comparativo de Meses */}
        {comparativo.length > 0 && (
          <div className="bg-white border border-neutral-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-neutral-900 mb-6">
              Últimos 12 Meses
            </h3>
            <div className="h-80">
              <Line data={comparativoData} options={comparativoOptions} />
            </div>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4">
        <p className="text-sm text-neutral-700">
          <strong>💡 Dica:</strong> Use os filtros de período para comparar seu consumo entre
          diferentes intervalos de tempo. Os dados são atualizados em tempo real.
        </p>
      </div>
    </div>
  );
}
