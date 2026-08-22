"use client";

import { useEffect, useState } from "react";
import { getPlatformStatsAction, getTopupsStatsAction } from "@/app/admin/dashboard/actions";

interface PlatformStats {
  total_alunos: number;
  alunos_ativos: number;
  total_horas_consumidas: number;
  total_receita: number;
  subscricoes_ativas: number;
  planos_mais_populares: Array<{ nome: string; quantidade: number }>;
}

interface TopupsStats {
  total_vendas: number;
  total_horas_vendidas: number;
  total_receita: number;
  pacote_mais_popular: string;
  receita_por_pacote: Array<{
    pacote: string;
    horas: number;
    vendas: number;
    receita: number;
  }>;
}

export function AdminDashboard() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [topupStats, setTopupStats] = useState<TopupsStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const [statsRes, topupsRes] = await Promise.all([
        getPlatformStatsAction(),
        getTopupsStatsAction(),
      ]);

      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data);
      }
      if (topupsRes.success && topupsRes.data) {
        setTopupStats(topupsRes.data);
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
        <h1 className="text-3xl font-bold text-neutral-900">Dashboard Admin</h1>
        <p className="text-neutral-600 mt-2">
          Visão geral da plataforma Sou Bilingue
        </p>
      </div>

      {/* Cards Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Alunos */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="text-sm text-blue-900 font-semibold mb-2">Total de Alunos</div>
          <div className="text-4xl font-bold text-blue-600">
            {stats?.total_alunos || 0}
          </div>
          <div className="text-xs text-blue-700 mt-2">
            {stats?.alunos_ativos || 0} ativos
          </div>
        </div>

        {/* Receita Total */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="text-sm text-green-900 font-semibold mb-2">Receita Total</div>
          <div className="text-4xl font-bold text-green-600">
            R$ {(stats?.total_receita || 0).toFixed(2)}
          </div>
          <div className="text-xs text-green-700 mt-2">Este período</div>
        </div>

        {/* Horas Consumidas */}
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
          <div className="text-sm text-purple-900 font-semibold mb-2">Horas Consumidas</div>
          <div className="text-4xl font-bold text-purple-600">
            {stats?.total_horas_consumidas || 0}h
          </div>
          <div className="text-xs text-purple-700 mt-2">Lifetime</div>
        </div>

        {/* Subscriptions Ativas */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
          <div className="text-sm text-amber-900 font-semibold mb-2">Assinaturas Ativas</div>
          <div className="text-4xl font-bold text-amber-600">
            {stats?.subscricoes_ativas || 0}
          </div>
          <div className="text-xs text-amber-700 mt-2">Planos ativos</div>
        </div>
      </div>

      {/* Duas colunas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Planos Mais Populares */}
        <div className="bg-white border border-neutral-200 rounded-lg p-6">
          <h2 className="text-lg font-bold text-neutral-900 mb-6">Planos Populares</h2>
          <div className="space-y-3">
            {stats?.planos_mais_populares.map((plano) => (
              <div key={plano.nome} className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="font-semibold text-neutral-900">{plano.nome}</div>
                  <div className="text-sm text-neutral-600">{plano.quantidade} assinaturas</div>
                </div>
                <div className="w-32 bg-neutral-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all"
                    style={{
                      width: `${
                        (plano.quantidade /
                          (stats.planos_mais_populares[0]?.quantidade || 1)) *
                        100
                      }%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Estatísticas de Topups */}
        <div className="bg-white border border-neutral-200 rounded-lg p-6">
          <h2 className="text-lg font-bold text-neutral-900 mb-6">Topups</h2>
          <div className="space-y-4">
            <div>
              <div className="text-sm text-neutral-600">Total Vendido</div>
              <div className="text-2xl font-bold text-neutral-900">
                {topupStats?.total_vendas || 0} vendas
              </div>
              <div className="text-sm text-neutral-600 mt-1">
                {topupStats?.total_horas_vendidas || 0}h horas
              </div>
            </div>
            <div className="pt-4 border-t border-neutral-200">
              <div className="text-sm text-neutral-600">Pacote Mais Popular</div>
              <div className="text-2xl font-bold text-neutral-900">
                {topupStats?.pacote_mais_popular || "N/A"}
              </div>
            </div>
            <div className="pt-4 border-t border-neutral-200">
              <div className="text-sm text-neutral-600">Receita Topups</div>
              <div className="text-2xl font-bold text-green-600">
                R$ {(topupStats?.total_receita || 0).toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabela de Receita por Pacote */}
      {topupStats && topupStats.receita_por_pacote.length > 0 && (
        <div className="bg-white border border-neutral-200 rounded-lg p-6">
          <h2 className="text-lg font-bold text-neutral-900 mb-6">Receita por Pacote</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50">
                  <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-900">
                    Pacote
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-900">
                    Vendas
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-900">
                    Horas
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-neutral-900">
                    Receita
                  </th>
                </tr>
              </thead>
              <tbody>
                {topupStats.receita_por_pacote.map((pacote) => (
                  <tr key={pacote.pacote} className="border-b border-neutral-200 hover:bg-neutral-50">
                    <td className="px-6 py-4 font-semibold text-neutral-900">
                      {pacote.pacote}
                    </td>
                    <td className="px-6 py-4 text-neutral-600">{pacote.vendas}</td>
                    <td className="px-6 py-4 text-neutral-600">{pacote.horas}h</td>
                    <td className="px-6 py-4 text-right font-bold text-green-600">
                      R$ {pacote.receita.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
