"use client";

import { useState, useEffect } from "react";
import { processCheckout, getPlanosList } from "./actions";
import { CHAVE_PLANO, enviarEvento } from "@/components/vendas/Rastreador";
import {
  DESCONTO_PRIMEIRA_MENSALIDADE,
  formatarPreco,
  aulasDoPlano,
  publicoDoPlano,
  aulasPorSemana,
  nomeDeExibicao,
  valorPrimeiraMensalidade,
} from "@/lib/billing/planos";

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
        // Plano escolhido na página de vendas (sessionStorage); senão, o primeiro.
        let escolhido: string | null = null;
        try {
          escolhido = window.sessionStorage.getItem(CHAVE_PLANO);
        } catch {
          // storage bloqueado
        }
        const doVendas = data.find((p) => p.nome === escolhido);
        if (doVendas) setSelectedPlan(doVendas.id);
        else if (data.length > 0) setSelectedPlan(data[0].id);
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
        enviarEvento("ida_ao_checkout", { plano: planos.find((p) => p.id === selectedPlan)?.nome });
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
            <h3 className="mb-2 text-xl font-bold">{nomeDeExibicao(plan.nome)}</h3>

            {/* Price */}
            <div className="mb-4">
              {valorPrimeiraMensalidade(plan.preco, plan.nome) < plan.preco ? (
                <>
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                    1º mês com {DESCONTO_PRIMEIRA_MENSALIDADE}% de desconto
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold">
                      {formatarPreco(valorPrimeiraMensalidade(plan.preco, plan.nome))}
                    </span>
                    <span className="text-sm text-neutral-500 line-through">{formatarPreco(plan.preco)}</span>
                  </div>
                  <p className="mt-1 text-sm text-neutral-600">depois {formatarPreco(plan.preco)}/mês</p>
                </>
              ) : (
                <span className="text-3xl font-bold">{formatarPreco(plan.preco)}</span>
              )}
            </div>

            {/* Hours */}
            <div className="mb-6 rounded-lg bg-blue-50 px-3 py-2">
              <p className="text-sm font-semibold text-blue-900">
                {aulasDoPlano(plan.horas_mensais)} ({aulasPorSemana(plan.horas_mensais)})
              </p>
            </div>

            {/* Para quem é o plano (a descrição do banco repetia as horas) */}
            <p className="text-sm text-neutral-600">{publicoDoPlano(plan.nome)}</p>

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
                    <span>Plano {nomeDeExibicao(plan.nome)}</span>
                    <span className="font-semibold">{formatarPreco(plan.preco)}/mês</span>
                  </div>
                  <div className="flex justify-between text-sm text-neutral-600">
                    <span>Aulas por mês</span>
                    <span>{plan.horas_mensais} aulas de 1 h</span>
                  </div>
                </div>

                <div className="flex justify-between">
                  <span className="font-bold">Total (primeira mensalidade)</span>
                  <span className="text-2xl font-bold">
                    {formatarPreco(valorPrimeiraMensalidade(plan.preco, plan.nome))}
                  </span>
                </div>
                {valorPrimeiraMensalidade(plan.preco, plan.nome) < plan.preco && (
                  <p className="mt-2 text-sm text-neutral-600">
                    {DESCONTO_PRIMEIRA_MENSALIDADE}% de desconto no 1º mês. A partir do 2º mês,{" "}
                    {formatarPreco(plan.preco)}/mês, cobrado automaticamente.
                  </p>
                )}

                <p className="mt-4 text-xs text-neutral-600">
                  ✓ Sem taxa de setup
                  ✓ Cancelação a qualquer momento
                  ✓ Acesso imediato após pagamento
                </p>
                <p className="mt-2 text-xs text-neutral-600">
                  Arrependeu-se? Em até 7 dias corridos após a confirmação do 1º pagamento, você pede o reembolso integral
                  pelo app, em Minha assinatura. Depois disso não há reembolso automático; cobrança indevida, duplicada ou
                  falha no serviço podem ser enviadas para análise.{" "}
                  <a href="/reembolso" className="underline">Política completa</a>.
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
