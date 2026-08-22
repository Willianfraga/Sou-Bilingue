"use client";

import { useEffect, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
} from "chart.js";
import { Line, Bar, Doughnut } from "react-chartjs-2";
import { getTendenciasAction, getConsumoMesAction, getHistoricoSessoesAction } from "@/app/aluno/dashboard/actions";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface Tendencia {
  data: string;
  horas_usadas: number;
  sessoes: number;
}

interface ConsumoData {
  mes: string;
  horas_total: number;
  horas_utilizadas: number;
  horas_restantes: number;
  percentual_usado: number;
  sessoes_total: number;
  duracao_media_minutos: number;
}

interface Sessao {
  id: string;
  iniciada_em: string;
  encerrada_em: string | null;
  duracao_minutos: number;
  segundos_utilizados: number;
  tipo: string;
}

export function ConsumoCharts() {
  const [tendencias, setTendencias] = useState<Tendencia[]>([]);
  const [consumo, setConsumo] = useState<ConsumoData | null>(null);
  const [sessoes, setSessoes] = useState<Sessao[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const [tendenciasRes, consumoRes, sessoesRes] = await Promise.all([
        getTendenciasAction(),
        getConsumoMesAction(),
        getHistoricoSessoesAction(30),
      ]);

      if (tendenciasRes.success && tendenciasRes.tendencias) {
        setTendencias(tendenciasRes.tendencias);
      }
      if (consumoRes.success && consumoRes.consumo) {
        setConsumo(consumoRes.consumo);
      }
      if (sessoesRes.success && sessoesRes.sessoes) {
        setSessoes(sessoesRes.sessoes);
      }
      setLoading(false);
    }

    loadData();
  }, []);

  if (loading) {
    return <div className="text-center py-12">Carregando gráficos...</div>;
  }

  // 1. Gráfico de Pizza — Horas usadas vs restantes
  const doughnutData = {
    labels: ["Usadas", "Restantes"],
    datasets: [
      {
        data: [consumo?.horas_utilizadas || 0, consumo?.horas_restantes || 0],
        backgroundColor: ["#3b82f6", "#e5e7eb"],
        borderColor: ["#1e40af", "#9ca3af"],
        borderWidth: 2,
      },
    ],
  };

  const doughnutOptions: ChartOptions<"doughnut"> = {
    responsive: true,
    plugins: {
      legend: {
        position: "bottom",
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            return `${context.label}: ${context.parsed}h`;
          },
        },
      },
    },
  };

  // 2. Gráfico de Barras — Últimos 7 dias
  const tendenciasLabels = tendencias.map((t) => {
    const data = new Date(t.data + "T00:00:00");
    return data.toLocaleDateString("pt-BR", { day: "numeric", month: "short" });
  });

  const barData = {
    labels: tendenciasLabels,
    datasets: [
      {
        label: "Horas usadas",
        data: tendencias.map((t) => t.horas_usadas),
        backgroundColor: "#3b82f6",
        borderColor: "#1e40af",
        borderWidth: 1,
      },
      {
        label: "Sessões",
        data: tendencias.map((t) => t.sessoes),
        backgroundColor: "#10b981",
        borderColor: "#047857",
        borderWidth: 1,
      },
    ],
  };

  const barOptions: ChartOptions<"bar"> = {
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

  // 3. Gráfico de Linha — Histórico de 30 dias
  const sessoesGrouped: { [key: string]: number } = {};
  sessoes.forEach((s) => {
    const data = new Date(s.iniciada_em);
    const key = data.toISOString().split("T")[0];
    sessoesGrouped[key] = (sessoesGrouped[key] || 0) + 1;
  });

  const sortedDatas = Object.keys(sessoesGrouped).sort().reverse().slice(0, 30);
  const lineLabels = sortedDatas
    .reverse()
    .map((d) => new Date(d + "T00:00:00").toLocaleDateString("pt-BR", { day: "numeric", month: "short" }));

  const lineData = {
    labels: lineLabels,
    datasets: [
      {
        label: "Sessões por dia",
        data: sortedDatas.reverse().map((d) => sessoesGrouped[d]),
        borderColor: "#8b5cf6",
        backgroundColor: "rgba(139, 92, 246, 0.1)",
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: "#8b5cf6",
        pointBorderColor: "#fff",
        pointBorderWidth: 2,
      },
    ],
  };

  const lineOptions: ChartOptions<"line"> = {
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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-neutral-900">Gráficos de Consumo</h2>
        <p className="text-neutral-600 mt-1">
          Visualize seus dados de consumo de horas
        </p>
      </div>

      {/* Gráficos em Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Pizza — Horas */}
        <div className="bg-white border border-neutral-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-neutral-900 mb-6">
            Consumo do Mês
          </h3>
          <div className="flex justify-center">
            <div className="w-full max-w-sm">
              <Doughnut data={doughnutData} options={doughnutOptions} />
            </div>
          </div>
          <div className="mt-6 text-center text-sm text-neutral-600">
            {consumo?.percentual_usado}% de {consumo?.horas_total}h usadas
          </div>
        </div>

        {/* Barras — Últimos 7 dias */}
        <div className="bg-white border border-neutral-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-neutral-900 mb-6">
            Últimos 7 Dias
          </h3>
          <Bar data={barData} options={barOptions} />
        </div>
      </div>

      {/* Linha — Histórico 30 dias (full width) */}
      <div className="bg-white border border-neutral-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-neutral-900 mb-6">
          Histórico de 30 Dias
        </h3>
        <div className="h-96">
          <Line data={lineData} options={lineOptions} />
        </div>
      </div>

      {/* Estatísticas Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-sm text-blue-900 font-semibold">Média de Sessões/dia</div>
          <div className="text-2xl font-bold text-blue-600 mt-2">
            {(consumo?.sessoes_total || 0) / 30}
          </div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-sm text-green-900 font-semibold">Dia Mais Produtivo</div>
          <div className="text-2xl font-bold text-green-600 mt-2">
            {Math.max(...tendencias.map((t) => t.horas_usadas), 0)}h
          </div>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="text-sm text-purple-900 font-semibold">Duração Média</div>
          <div className="text-2xl font-bold text-purple-600 mt-2">
            {consumo?.duracao_media_minutos || 0}min
          </div>
        </div>
      </div>
    </div>
  );
}
