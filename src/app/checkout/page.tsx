"use client";

import { useState, useEffect } from "react";
import { processCheckout, getPlanosList } from "./actions";

interface Plan {
  id: string;
  nome: string;
  preco: number;
  horas_mensais: number;
  descricao: string;
}

export default function CheckoutPage() {
  const [planos, setPlanos] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    // Buscar planos disponíveis
    const fetchPlanos = async () => {
      try {
        const data = await getPlanosList();
        setPlanos(data);
        // Selecionar primeiro plano por padrão
        if (data.length > 0) {
          setSelectedPlan(data[0].id);
        }
      } catch (err) {
        setError("Erro ao carregar planos");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchPlanos();
  }, []);

  const handleSelectPlan = (planId: string) => {
    setSelectedPlan(planId);
  };

  const handleCheckout = async () => {
    if (!selectedPlan) {
      setError("Selecione um plano");
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const result = await processCheckout(selectedPlan);
      if (result.success && result.checkoutUrl) {
        // Redirecionar para o checkout do Asaas
        window.location.href = result.checkoutUrl;
      } else {
        setError(result.error || "Erro ao processar pagamento");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro ao processar pagamento"
      );
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <main className="mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center px-6">
        <p className="text-neutral-600">Carregando planos...</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col px-6 py-16">
      {/* Header */}
      <div className="mb-12">
        <h1 className="text-4xl font-bold">Escolha seu plano</h1>
        <p className="mt-3 text-lg text-neutral-600">
          Acesso ilimitado com limite de horas mensais
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Plans Grid */}
      <div className="mb-8 grid gap-6 md:grid-cols-3">
        {planos.map((plan) => (
          <div
            key={plan.id}
            onClick={() => handleSelectPlan(plan.id)}
            className={`cursor-pointer rounded-lg border-2 p-6 transition ${
              selectedPlan === plan.id
                ? "border-blue-600 bg-blue-50"
                : "border-neutral-200 bg-white hover:border-neutral-300"
            }`}
          >
            {/* Checkmark */}
            {selectedPlan === plan.id && (
              <div className="mb-4 flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white">
                ✓
              </div>
            )}

            {/* Plan Name */}
            <h3 className="mb-2 text-xl font-bold capitalize">{plan.nome}</h3>

            {/* Price */}
            <div className="mb-4">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">
                  R$ {plan.preco.toFixed(2).replace(".", ",")}
                </span>
                <span className="text-neutral-600">/mês</span>
              </div>
            </div>

            {/* Hours */}
            <div className="mb-6 rounded-lg bg-blue-50 px-3 py-2">
              <p className="text-sm font-semibold text-blue-900">
                {plan.horas_mensais}h de conversação
              </p>
            </div>

            {/* Description */}
            <p className="text-sm text-neutral-600">{plan.descricao}</p>

            {/* Button */}
            <button
              onClick={() => handleSelectPlan(plan.id)}
            className={`mt-6 w-full rounded-2xl px-4 py-3 font-bold transition ${
              selectedPlan === plan.id
                  ? "bg-white text-indigo-700 shadow-lg ring-1 ring-indigo-100"
                  : "bg-neutral-100 text-neutral-900 hover:bg-white hover:text-indigo-700 hover:shadow-md"
              }`}
            >
              {selectedPlan === plan.id ? "Selecionado" : "Selecionar"}
            </button>
          </div>
        ))}
      </div>

      {/* Checkout Summary */}
      {selectedPlan && (
        <div className="mb-8 rounded-lg bg-neutral-50 p-6">
          <h2 className="mb-4 text-lg font-bold">Resumo do pedido</h2>

          {(() => {
            const plan = planos.find((p) => p.id === selectedPlan);
            if (!plan) return null;

            return (
              <>
                <div className="mb-4 space-y-2 border-b border-neutral-200 pb-4">
                  <div className="flex justify-between">
                    <span>Plano {plan.nome}</span>
                    <span className="font-semibold">
                      R$ {plan.preco.toFixed(2).replace(".", ",")}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm text-neutral-600">
                    <span>Horas mensais</span>
                    <span>{plan.horas_mensais}h</span>
                  </div>
                </div>

                <div className="flex justify-between">
                  <span className="font-bold">Total (primeira mensalidade)</span>
                  <span className="text-2xl font-bold">
                    R$ {plan.preco.toFixed(2).replace(".", ",")}
                  </span>
                </div>

                <p className="mt-4 text-xs text-neutral-600">
                  ✓ Sem taxa de setup
                  ✓ Cancelação a qualquer momento
                  ✓ Acesso imediato após pagamento
                </p>
              </>
            );
          })()}
        </div>
      )}

      {/* Checkout Button */}
      <button
        onClick={handleCheckout}
        disabled={!selectedPlan || processing}
        className={`btn-premium-wide text-lg ${
          !selectedPlan || processing
            ? "cursor-not-allowed bg-neutral-200 text-neutral-500 shadow-none"
            : "border-indigo-100"
        }`}
      >
        {processing ? "Processando..." : "Continuar para pagamento →"}
      </button>

      {/* Footer Text */}
      <p className="mt-6 text-center text-sm text-neutral-600">
        Você será redirecionado para completar o pagamento de forma segura
      </p>
    </main>
  );
}
