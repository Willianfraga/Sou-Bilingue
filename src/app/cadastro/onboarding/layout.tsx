"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { ETAPAS, OnboardingProvider } from "./_componentes/onboarding-context";

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const slug = pathname.split("/").pop();
  const indice = Math.max(0, ETAPAS.findIndex((e) => e.slug === slug));

  return (
    <OnboardingProvider>
      <main className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-950 px-6 py-10 text-white">
        <div className="mx-auto max-w-5xl rounded-[2rem] border border-white/10 bg-white/8 p-8 shadow-2xl backdrop-blur md:p-10">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-xs font-black uppercase tracking-[0.24em] text-cyan-200">
                SouBilingue · onboarding
              </span>
              <h1 className="mt-3 text-3xl font-black md:text-4xl">Personalize sua jornada</h1>
            </div>
            <span className="rounded-full border border-cyan-300/50 px-4 py-2 text-sm font-bold text-cyan-100">
              Passo {indice + 1} de {ETAPAS.length}
            </span>
          </div>

          <ol className="mb-8 grid grid-cols-5 gap-2" aria-label="Etapas do onboarding">
            {ETAPAS.map((etapa, i) => (
              <li key={etapa.slug}>
                <div
                  className={`h-1.5 rounded-full ${i <= indice ? "bg-cyan-300" : "bg-white/15"}`}
                />
                <span
                  className={`mt-2 hidden text-xs font-bold sm:block ${
                    i === indice ? "text-cyan-100" : "text-slate-400"
                  }`}
                  aria-current={i === indice ? "step" : undefined}
                >
                  {etapa.titulo}
                </span>
              </li>
            ))}
          </ol>

          {children}
        </div>
      </main>
    </OnboardingProvider>
  );
}
