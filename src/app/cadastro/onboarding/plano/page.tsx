"use client";

import { CARD_CLASSE, PLANOS, useOnboarding } from "../_componentes/onboarding-context";
import { ResumoLateral } from "../_componentes/ResumoLateral";

export default function EtapaPlano() {
  const { escolhas, atualizar } = useOnboarding();

  return (
    <div className="grid gap-8 md:grid-cols-[1fr_420px]">
      <section className={CARD_CLASSE}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-black text-white">Escolha o plano</h2>
          <span className="text-xs font-bold uppercase text-cyan-200">Plano</span>
        </div>
        <div className="grid grid-cols-1 gap-3">
          {PLANOS.map((item) => (
            <button
              type="button"
              key={item.valor}
              onClick={() => atualizar({ plano: item.valor })}
              aria-pressed={escolhas.plano === item.valor}
              className={`flex items-center justify-between rounded-2xl border px-4 py-4 text-left transition ${
                escolhas.plano === item.valor
                  ? "border-violet-300 bg-violet-400/30 shadow-lg shadow-violet-700/20"
                  : "border-white/20 bg-white/5 hover:bg-white/12"
              }`}
            >
              <span>
                <span className="block text-sm font-black text-white">{item.nome}</span>
                <span className="block text-xs font-semibold text-slate-300">{item.descricao}</span>
              </span>
              <span className="rounded-full bg-white/10 px-3 py-2 text-xs font-black text-cyan-100">
                {item.horas}
              </span>
            </button>
          ))}
        </div>
      </section>

      <ResumoLateral etapa="plano" />
    </div>
  );
}
