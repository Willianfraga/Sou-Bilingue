"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ETAPAS, IDIOMAS, PLANOS, useOnboarding, type SlugEtapa } from "./onboarding-context";

export function ResumoLateral({ etapa }: { etapa: SlugEtapa }) {
  const router = useRouter();
  const { escolhas, tutores, limpar } = useOnboarding();
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const indice = ETAPAS.findIndex((e) => e.slug === etapa);
  const anterior = indice > 0 ? ETAPAS[indice - 1] : null;
  const proxima = indice < ETAPAS.length - 1 ? ETAPAS[indice + 1] : null;

  const idioma = IDIOMAS.find((i) => i.valor === escolhas.idioma);
  const plano = PLANOS.find((p) => p.valor === escolhas.plano);
  const tutor = tutores.find((t) => t.id === escolhas.tutorId);
  const bloqueado = etapa === "tutor" && !tutor;

  async function salvar() {
    setErro(null);
    if (!tutor) {
      setErro("Escolha um tutor para continuar.");
      return;
    }
    setSalvando(true);
    try {
      const resposta = await fetch("/api/cadastro/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idioma: escolhas.idioma,
          plano: escolhas.plano,
          tutorId: escolhas.tutorId,
          objetivo: escolhas.objetivo,
        }),
      });
      const payload = await resposta.json().catch(() => null);
      if (!resposta.ok || !payload?.success) {
        setErro(payload?.error || "Não foi possível salvar seu onboarding.");
        return;
      }
      limpar();
      router.push("/checkout");
    } catch {
      setErro("Não foi possível salvar seu onboarding. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  }

  const botaoPrincipal =
    "mt-2 block w-full rounded-2xl bg-slate-950 px-5 py-4 text-center text-sm font-black text-white transition hover:bg-violet-800 disabled:opacity-60";

  return (
    <aside className="h-fit rounded-[1.8rem] border border-white/20 bg-white p-6 text-slate-950 shadow-xl">
      <div className="mb-4">
        <span className="text-xs font-black uppercase tracking-[0.2em] text-violet-700">Resumo</span>
        <h2 className="mt-3 text-2xl font-black">Seu perfil</h2>
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl bg-slate-50 p-4">
          <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Idioma</span>
          <div className="mt-2 text-lg font-black text-slate-950">
            {idioma?.bandeira} {idioma?.nome}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4">
          <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Plano</span>
          <div className="mt-2 text-lg font-black text-slate-950">{plano?.nome}</div>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4">
          <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Tutor</span>
          <div className="mt-2 text-lg font-black text-slate-950">
            {tutor?.nome || "Escolha um professor"}
          </div>
        </div>

        {escolhas.objetivo && (
          <div className="rounded-2xl bg-slate-50 p-4">
            <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Objetivo</span>
            <p className="mt-2 text-sm font-semibold text-slate-700">{escolhas.objetivo}</p>
          </div>
        )}

        {erro && (
          <div
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700"
          >
            {erro}
          </div>
        )}

        {!proxima ? (
          <button type="button" onClick={salvar} disabled={salvando} className={botaoPrincipal}>
            {salvando ? "Salvando..." : "Salvar meu percurso"}
          </button>
        ) : bloqueado ? (
          <button type="button" disabled className={botaoPrincipal}>
            Continuar
          </button>
        ) : (
          <Link href={`/cadastro/onboarding/${proxima.slug}`} className={botaoPrincipal}>
            Continuar
          </Link>
        )}

        {anterior && (
          <Link
            href={`/cadastro/onboarding/${anterior.slug}`}
            className="block text-center text-sm font-bold text-violet-700 hover:text-violet-900"
          >
            ← Voltar para {anterior.titulo.toLowerCase()}
          </Link>
        )}
      </div>
    </aside>
  );
}
