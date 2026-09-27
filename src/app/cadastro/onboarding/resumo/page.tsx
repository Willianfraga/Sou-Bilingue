"use client";

import Link from "next/link";
import { CARD_CLASSE, IDIOMAS, PLANOS, useOnboarding } from "../_componentes/onboarding-context";
import { ResumoLateral } from "../_componentes/ResumoLateral";

export default function EtapaResumo() {
  const { escolhas, tutores } = useOnboarding();

  const linhas = [
    {
      rotulo: "Idioma",
      valor: IDIOMAS.find((i) => i.valor === escolhas.idioma)?.nome,
      href: "/cadastro/onboarding/idioma",
    },
    {
      rotulo: "Plano",
      valor: PLANOS.find((p) => p.valor === escolhas.plano)?.nome,
      href: "/cadastro/onboarding/plano",
    },
    {
      rotulo: "Tutor",
      valor: tutores.find((t) => t.id === escolhas.tutorId)?.nome || "Nenhum escolhido",
      href: "/cadastro/onboarding/tutor",
    },
    {
      rotulo: "Objetivo",
      valor: escolhas.objetivo || "Não informado",
      href: "/cadastro/onboarding/objetivo",
    },
  ];

  return (
    <div className="grid gap-8 md:grid-cols-[1fr_420px]">
      <section className={CARD_CLASSE}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-black text-white">Confira suas escolhas</h2>
          <span className="text-xs font-bold uppercase text-cyan-200">Revisão</span>
        </div>
        <ul className="space-y-3">
          {linhas.map((linha) => (
            <li
              key={linha.rotulo}
              className="flex items-start justify-between gap-4 rounded-2xl border border-white/20 bg-white/5 px-4 py-4"
            >
              <span>
                <span className="block text-xs font-bold uppercase tracking-wide text-slate-400">
                  {linha.rotulo}
                </span>
                <span className="mt-1 block text-sm font-black text-white">{linha.valor}</span>
              </span>
              <Link
                href={linha.href}
                className="shrink-0 rounded-full bg-white/10 px-3 py-2 text-xs font-black text-cyan-100 hover:bg-white/20"
              >
                Alterar
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <ResumoLateral etapa="resumo" />
    </div>
  );
}
