"use client";

import { CARD_CLASSE, IDIOMAS, useOnboarding } from "../_componentes/onboarding-context";
import { ResumoLateral } from "../_componentes/ResumoLateral";

export default function EtapaIdioma() {
  const { escolhas, atualizar } = useOnboarding();

  return (
    <div className="grid gap-8 md:grid-cols-[1fr_420px]">
      <section className={CARD_CLASSE}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-black text-white">Escolha o idioma</h2>
          <span className="text-xs font-bold uppercase text-cyan-200">Idioma</span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {IDIOMAS.map((item) => (
            <button
              type="button"
              key={item.valor}
              onClick={() => atualizar({ idioma: item.valor })}
              aria-pressed={escolhas.idioma === item.valor}
              className={`rounded-2xl border px-4 py-4 text-left transition ${
                escolhas.idioma === item.valor
                  ? "border-cyan-300 bg-cyan-400/30 shadow-lg shadow-cyan-700/20"
                  : "border-white/20 bg-white/5 hover:bg-white/12"
              }`}
            >
              <span className="block text-2xl">{item.bandeira}</span>
              <span className="mt-2 block text-sm font-bold">{item.nome}</span>
            </button>
          ))}
        </div>
      </section>

      <ResumoLateral etapa="idioma" />
    </div>
  );
}
