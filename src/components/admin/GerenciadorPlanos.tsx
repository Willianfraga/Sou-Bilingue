"use client";

import { useEffect, useState } from "react";
import { getPlanosPrecosAction, atualizarPlanosPrecoAction } from "@/app/admin/dashboard/actions";

interface Plano {
  id: string;
  nome: string;
  preco: number;
  horas: number;
}

export function GerenciadorPlanos() {
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState<string | null>(null);
  const [novoPreco, setNovoPreco] = useState<number>(0);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    async function loadData() {
      const res = await getPlanosPrecosAction();
      if (res.success && res.data) {
        setPlanos(res.data);
      }
      setLoading(false);
    }

    loadData();
  }, []);

  const handleEditarPreco = (plano: Plano) => {
    setEditando(plano.id);
    setNovoPreco(plano.preco);
  };

  const handleSalvarPreco = async (planoId: string) => {
    if (novoPreco <= 0) {
      alert("Preço deve ser maior que zero");
      return;
    }

    setSalvando(true);
    const res = await atualizarPlanosPrecoAction(planoId, novoPreco);

    if (res.success) {
      setPlanos(
        planos.map((p) => (p.id === planoId ? { ...p, preco: novoPreco } : p))
      );
      setEditando(null);
    } else {
      alert(res.error || "Erro ao salvar preço");
    }
    setSalvando(false);
  };

  if (loading) {
    return <div className="text-center py-12">Carregando planos...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-neutral-900">Gerenciar Planos</h2>
        <p className="text-neutral-600 mt-1">
          Configurar preços e características dos planos
        </p>
      </div>

      {/* Grid de Planos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {planos.map((plano) => (
          <div key={plano.id} className="bg-white border border-neutral-200 rounded-lg p-6">
            <div className="mb-4">
              <h3 className="text-xl font-bold text-neutral-900">{plano.nome}</h3>
              <div className="text-3xl font-bold text-blue-600 mt-2">
                {plano.horas}h
              </div>
              <p className="text-sm text-neutral-600 mt-1">horas por mês</p>
            </div>

            <div className="border-t border-neutral-200 pt-4">
              {editando === plano.id ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-semibold text-neutral-900 mb-2">
                      Novo preço (R$)
                    </label>
                    <input
                      type="number"
                      value={novoPreco}
                      onChange={(e) => setNovoPreco(parseFloat(e.target.value))}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:border-blue-500"
                      step="0.01"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSalvarPreco(plano.id)}
                      disabled={salvando}
                      className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold disabled:opacity-50"
                    >
                      {salvando ? "Salvando..." : "Salvar"}
                    </button>
                    <button
                      onClick={() => setEditando(null)}
                      disabled={salvando}
                      className="flex-1 px-3 py-2 bg-neutral-200 text-neutral-900 rounded-lg hover:bg-neutral-300 font-semibold disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-600">Preço atual</span>
                    <span className="text-2xl font-bold text-green-600">
                      R$ {plano.preco.toFixed(2)}
                    </span>
                  </div>
                  <button
                    onClick={() => handleEditarPreco(plano)}
                    className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
                  >
                    Editar Preço
                  </button>
                </div>
              )}
            </div>

            {/* Info Box */}
            <div className="mt-4 p-3 bg-neutral-50 rounded-lg">
              <div className="text-xs text-neutral-600">
                <strong>ID:</strong> {plano.id}
              </div>
              <div className="text-xs text-neutral-600 mt-1">
                <strong>Valor/hora:</strong> R$ {(plano.preco / plano.horas).toFixed(2)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          <strong>💡 Dica:</strong> Ao atualizar preços, novos clientes verão o novo valor.
          Clientes existentes não são afetados até a próxima renovação.
        </p>
      </div>
    </div>
  );
}
