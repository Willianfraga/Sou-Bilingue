"use client";

import { useState } from "react";
import { PASSOS } from "@/lib/vendas/produto";

export function ComoFunciona() {
  const [ativo, setAtivo] = useState(0);
  const passo = PASSOS[ativo];

  function aoTeclar(e: React.KeyboardEvent) {
    if (e.key === "ArrowRight" || e.key === "ArrowDown") setAtivo((a) => (a + 1) % PASSOS.length);
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") setAtivo((a) => (a - 1 + PASSOS.length) % PASSOS.length);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <div role="tablist" aria-label="Passos de como funciona" aria-orientation="vertical" className="grid gap-2" onKeyDown={aoTeclar}>
        {PASSOS.map((p, i) => (
          <button
            key={p.titulo}
            role="tab"
            id={`passo-${i}`}
            aria-selected={i === ativo}
            aria-controls="painel-passo"
            tabIndex={i === ativo ? 0 : -1}
            onClick={() => setAtivo(i)}
            className={`flex items-center gap-4 rounded-2xl px-4 py-3 text-left transition focus:outline-none focus-visible:ring-4 focus-visible:ring-violet-300 ${
              i === ativo ? "bg-white shadow-lg ring-1 ring-violet-200" : "hover:bg-white/70"
            }`}
          >
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-black ${
                i === ativo ? "bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white" : "bg-violet-100 text-violet-700"
              }`}
            >
              {i + 1}
            </span>
            <span className="font-bold text-slate-900">{p.titulo}</span>
          </button>
        ))}
      </div>
      <div
        id="painel-passo"
        role="tabpanel"
        aria-labelledby={`passo-${ativo}`}
        className="flex flex-col justify-center rounded-3xl bg-gradient-to-br from-indigo-950 via-violet-950 to-fuchsia-950 p-8 text-white shadow-2xl"
      >
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-fuchsia-300">Passo {ativo + 1} de {PASSOS.length}</p>
        <h3 className="mt-3 text-2xl font-black sm:text-3xl">{passo.titulo}</h3>
        <p className="mt-4 text-base leading-relaxed text-slate-200">{passo.texto}</p>
        <p className="mt-6 rounded-2xl bg-white/10 px-4 py-3 text-sm text-cyan-100">{passo.detalhe}</p>
      </div>
    </div>
  );
}
