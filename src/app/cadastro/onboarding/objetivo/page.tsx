"use client";

import { CARD_CLASSE, useOnboarding } from "../_componentes/onboarding-context";
import { ResumoLateral } from "../_componentes/ResumoLateral";

export default function EtapaObjetivo() {
  const { escolhas, atualizar } = useOnboarding();

  return (
    <div className="grid gap-8 md:grid-cols-[1fr_420px]">
      <section className={CARD_CLASSE}>
        <div className="mb-3 flex items-center justify-between">
          <label htmlFor="objetivo" className="text-xl font-black text-white">
            Objetivo pessoal
          </label>
          <span className="text-xs font-bold uppercase text-cyan-200">Opcional</span>
        </div>
        <p className="mb-4 text-sm text-slate-300">
          Conte ao seu tutor o que você quer conquistar. Ele usa isso para montar as conversas.
        </p>
        <textarea
          id="objetivo"
          value={escolhas.objetivo}
          onChange={(e) => atualizar({ objetivo: e.target.value })}
          rows={5}
          maxLength={500}
          className="w-full rounded-2xl border border-white/20 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-300 focus:ring-4 focus:ring-cyan-100"
          placeholder="Ex.: Quero conversar com mais segurança no trabalho."
        />
        <p className="mt-2 text-right text-xs text-slate-400">{escolhas.objetivo.length}/500</p>
      </section>

      <ResumoLateral etapa="objetivo" />
    </div>
  );
}
