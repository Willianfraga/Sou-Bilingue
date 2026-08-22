"use client";

import { useEffect, useState } from "react";
import { getHistoricoSessoesAction } from "@/app/aluno/dashboard/actions";

interface Sessao {
  id: string;
  iniciada_em: string;
  encerrada_em: string | null;
  duracao_minutos: number;
  segundos_utilizados: number;
  tipo: string;
}

export function HistoricoSessoes() {
  const [sessoes, setSessoes] = useState<Sessao[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const res = await getHistoricoSessoesAction(30);
      if (res.success && res.sessoes) {
        setSessoes(res.sessoes);
      }
      setLoading(false);
    }

    loadData();
  }, []);

  if (loading) {
    return <div className="text-center py-12">Carregando histórico...</div>;
  }

  if (sessoes.length === 0) {
    return (
      <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-8 text-center">
        <p className="text-neutral-600">Nenhuma sessão registrada ainda.</p>
        <p className="text-sm text-neutral-500 mt-2">
          Comece uma sessão de conversação para ver seu histórico aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-neutral-900">Histórico de Sessões</h2>
        <p className="text-neutral-600 mt-1">
          Últimas {sessoes.length} conversações
        </p>
      </div>

      <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50">
              <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-900">
                Data
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-900">
                Horário
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-900">
                Duração
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-900">
                Tipo
              </th>
              <th className="px-6 py-3 text-right text-sm font-semibold text-neutral-900">
                Horas
              </th>
            </tr>
          </thead>
          <tbody>
            {sessoes.map((sessao) => {
              const data = new Date(sessao.iniciada_em);
              const dataFormatada = data.toLocaleDateString("pt-BR");
              const horaFormatada = data.toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              });
              const horas = (sessao.segundos_utilizados / 3600).toFixed(2);

              return (
                <tr key={sessao.id} className="border-b border-neutral-200 hover:bg-neutral-50">
                  <td className="px-6 py-4 text-sm text-neutral-900">{dataFormatada}</td>
                  <td className="px-6 py-4 text-sm text-neutral-600">{horaFormatada}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-neutral-900">
                    {sessao.duracao_minutos}min
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className="px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                      {sessao.tipo === "conversa" ? "Conversação" : sessao.tipo}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-right text-neutral-900">
                    {horas}h
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
