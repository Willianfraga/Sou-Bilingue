"use client";

import { useState } from "react";
import { PERIODOS, ROTULO_PERIODO, type Periodo } from "@/lib/admin/periodos";
import { nomeDeExibicao } from "@/lib/billing/planos";

// Filtros por período e dimensões, numa linha acima dos gráficos. Formulário
// GET: o servidor valida tudo de novo (resolverPeriodo, listas conhecidas).
export function FiltrosPainel({
  periodo,
  de,
  ate,
  idioma,
  plano,
  tutor,
  opcoes,
}: {
  periodo: Periodo;
  de?: string;
  ate?: string;
  idioma: string | null;
  plano: string | null;
  tutor: string | null;
  opcoes: { idiomas: Array<[string, string]>; planos: string[]; tutores: Array<{ id: string; nome: string }> };
}) {
  const [escolhido, setEscolhido] = useState<Periodo>(periodo);
  const campo = "mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200";

  return (
    <form method="get" className="grid grid-cols-2 gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-3 xl:grid-cols-6">
      <label className="text-xs font-semibold text-slate-600">
        Período
        <select name="periodo" value={escolhido} onChange={(e) => setEscolhido(e.target.value as Periodo)} className={campo}>
          {PERIODOS.map((p) => (
            <option key={p} value={p}>{ROTULO_PERIODO[p]}</option>
          ))}
        </select>
      </label>
      {escolhido === "personalizado" && (
        <>
          <label className="text-xs font-semibold text-slate-600">
            De
            <input type="date" name="de" defaultValue={de} required className={campo} />
          </label>
          <label className="text-xs font-semibold text-slate-600">
            Até
            <input type="date" name="ate" defaultValue={ate} required className={campo} />
          </label>
        </>
      )}
      <label className="text-xs font-semibold text-slate-600">
        Idioma
        <select name="idioma" defaultValue={idioma ?? ""} className={campo}>
          <option value="">Todos</option>
          {opcoes.idiomas.map(([k, nome]) => (
            <option key={k} value={k}>{nome}</option>
          ))}
        </select>
      </label>
      <label className="text-xs font-semibold text-slate-600">
        Plano
        <select name="plano" defaultValue={plano ?? ""} className={campo}>
          <option value="">Todos</option>
          {opcoes.planos.map((p) => (
            <option key={p} value={p}>{nomeDeExibicao(p)}</option>
          ))}
        </select>
      </label>
      <label className="text-xs font-semibold text-slate-600">
        Tutor
        <select name="tutor" defaultValue={tutor ?? ""} className={campo}>
          <option value="">Todos</option>
          {opcoes.tutores.map((t) => (
            <option key={t.id} value={t.id}>{t.nome}</option>
          ))}
        </select>
      </label>
      <div className="flex items-end">
        <button type="submit" className="w-full rounded-lg bg-violet-700 px-4 py-2 text-sm font-bold text-white hover:bg-violet-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-300">
          Aplicar
        </button>
      </div>
    </form>
  );
}
