"use client";

import { useEffect, useState } from "react";
import { listAlunos, obterDetalhesAlunoAction } from "@/app/admin/dashboard/actions";

interface AlunoInfo {
  id: string;
  email: string;
  nome: string;
  plano_ativo: string | null;
  horas_restantes: number;
  data_criacao: string;
}

interface AlunoDetalhes {
  id: string;
  email: string;
  nome: string;
  plano_ativo: string | null;
  horas_totais: number;
  horas_usadas: number;
  sessoes_total: number;
  total_gasto: number;
  data_criacao: string;
}

export function ListaAlunos() {
  const [alunos, setAlunos] = useState<AlunoInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecionado, setSelecionado] = useState<AlunoDetalhes | null>(null);
  const [showDetalhes, setShowDetalhes] = useState(false);

  useEffect(() => {
    async function loadData() {
      const res = await listAlunos(50, 0);
      if (res.success && res.data) {
        setAlunos(res.data);
      }
      setLoading(false);
    }

    loadData();
  }, []);

  const handleVerDetalhes = async (alunoId: string) => {
    const res = await obterDetalhesAlunoAction(alunoId);
    if (res.success && res.data) {
      setSelecionado(res.data);
      setShowDetalhes(true);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Carregando alunos...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-neutral-900">Gerenciar Alunos</h2>
        <p className="text-neutral-600 mt-1">
          Total de {alunos.length} alunos registrados
        </p>
      </div>

      {/* Tabela */}
      <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50">
              <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-900">
                Nome
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-900">
                Email
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-900">
                Plano
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-900">
                Cadastro
              </th>
              <th className="px-6 py-3 text-center text-sm font-semibold text-neutral-900">
                Ações
              </th>
            </tr>
          </thead>
          <tbody>
            {alunos.map((aluno) => (
              <tr key={aluno.id} className="border-b border-neutral-200 hover:bg-neutral-50">
                <td className="px-6 py-4 font-semibold text-neutral-900">
                  {aluno.nome}
                </td>
                <td className="px-6 py-4 text-neutral-600 text-sm">{aluno.email}</td>
                <td className="px-6 py-4">
                  {aluno.plano_ativo ? (
                    <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                      {aluno.plano_ativo}
                    </span>
                  ) : (
                    <span className="text-sm text-neutral-600">Sem plano</span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-neutral-600">
                  {new Date(aluno.data_criacao).toLocaleDateString("pt-BR")}
                </td>
                <td className="px-6 py-4 text-center">
                  <button
                    onClick={() => handleVerDetalhes(aluno.id)}
                    className="text-blue-600 hover:text-blue-800 font-semibold text-sm"
                  >
                    Ver detalhes
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal de Detalhes */}
      {showDetalhes && selecionado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-2xl w-full mx-4">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-bold text-neutral-900">
                  {selecionado.nome}
                </h3>
                <p className="text-neutral-600 text-sm mt-1">{selecionado.email}</p>
              </div>
              <button
                onClick={() => setShowDetalhes(false)}
                className="text-2xl text-neutral-400 hover:text-neutral-600"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-sm text-blue-900 font-semibold">Plano Ativo</div>
                <div className="text-2xl font-bold text-blue-600 mt-2">
                  {selecionado.plano_ativo || "N/A"}
                </div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-sm text-purple-900 font-semibold">Horas Totais</div>
                <div className="text-2xl font-bold text-purple-600 mt-2">
                  {selecionado.horas_totais}h
                </div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-sm text-green-900 font-semibold">Horas Usadas</div>
                <div className="text-2xl font-bold text-green-600 mt-2">
                  {selecionado.horas_usadas}h
                </div>
              </div>
              <div className="bg-amber-50 p-4 rounded-lg">
                <div className="text-sm text-amber-900 font-semibold">Total Gasto</div>
                <div className="text-2xl font-bold text-amber-600 mt-2">
                  R$ {selecionado.total_gasto.toFixed(2)}
                </div>
              </div>
            </div>

            <div className="space-y-2 mb-6 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-600">Sessões totais</span>
                <span className="font-semibold text-neutral-900">
                  {selecionado.sessoes_total}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-600">Cadastrado em</span>
                <span className="font-semibold text-neutral-900">
                  {new Date(selecionado.data_criacao).toLocaleDateString("pt-BR")}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <button className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold">
                Enviar Email
              </button>
              <button className="flex-1 px-4 py-2 bg-neutral-200 text-neutral-900 rounded-lg hover:bg-neutral-300 font-semibold">
                Contato Direto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
