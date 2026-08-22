"use client";

import { useState } from "react";

export type Periodicidade = "semana" | "mes" | "trimestre" | "ano";

interface FiltrosPeriodicidadeProps {
  onFilterChange: (periodo: Periodicidade) => void;
  current: Periodicidade;
}

export function FiltrosPeriodicidade({ onFilterChange, current }: FiltrosPeriodicidadeProps) {
  const periodos: { id: Periodicidade; label: string; descricao: string }[] = [
    { id: "semana", label: "Última Semana", descricao: "Últimos 7 dias" },
    { id: "mes", label: "Último Mês", descricao: "Últimos 30 dias" },
    { id: "trimestre", label: "Último Trimestre", descricao: "Últimos 90 dias" },
    { id: "ano", label: "Último Ano", descricao: "Últimos 365 dias" },
  ];

  return (
    <div className="bg-white border border-neutral-200 rounded-lg p-6">
      <div>
        <h3 className="text-lg font-semibold text-neutral-900 mb-4">Período</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {periodos.map((periodo) => (
            <button
              key={periodo.id}
              onClick={() => onFilterChange(periodo.id)}
              className={`p-3 rounded-lg border-2 transition-all ${
                current === periodo.id
                  ? "border-blue-500 bg-blue-50 text-blue-900"
                  : "border-neutral-200 bg-white text-neutral-900 hover:border-blue-300"
              }`}
            >
              <div className="font-semibold text-sm">{periodo.label}</div>
              <div className="text-xs opacity-75 mt-1">{periodo.descricao}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
