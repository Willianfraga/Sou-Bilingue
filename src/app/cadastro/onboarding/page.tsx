"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Idioma, Plano } from "@/lib/types";

type Tutor = {
  id: string;
  nome: string;
  descricao: string;
  foto_url?: string;
};

const idiomas = [
  { valor: "ingles", nome: "Inglês", bandeira: "🇺🇸" },
  { valor: "espanhol", nome: "Espanhol", bandeira: "🇪🇸" },
  { valor: "frances", nome: "Francês", bandeira: "🇫🇷" },
  { valor: "italiano", nome: "Italiano", bandeira: "🇮🇹" },
  { valor: "mandarim", nome: "Mandarim", bandeira: "🇨🇳" },
];

const planos = [
  { valor: "basico", nome: "Básico", descricao: "3x por semana", horas: "6h/mês" },
  { valor: "intermediario", nome: "Intermediário", descricao: "5x por semana", horas: "10h/mês" },
  { valor: "avancado", nome: "Avançado", descricao: "7x por semana", horas: "14h/mês" },
];

export default function CadastroOnboardingPage() {
  const router = useRouter();
  const [tutores, setTutores] = useState<Tutor[]>([]);
  const [idioma, setIdioma] = useState<Idioma>("ingles");
  const [plano, setPlano] = useState<Plano>("basico");
  const [tutorId, setTutorId] = useState("");
  const [objetivo, setObjetivo] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data: userData } = await supabase.auth.getUser();

        if (!userData.user?.id) {
          router.push("/login");
          return;
        }

        const response = await fetch("/api/tutores");
        const payload = await response.json();

        if (!response.ok || !payload.success) {
          throw new Error(payload.error || "Não foi possível carregar os tutores.");
        }

        const lista = payload.tutores ?? [];
        if (lista.length > 0) {
          setTutorId(lista[0].id);
        }

        setTutores(lista);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Não foi possível carregar o onboarding.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!tutorId) {
      setError("Escolha um tutor para continuar.");
      return;
    }

    setSaving(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      if (!userId) {
        setError("Sua sessão expirou. Faça login novamente.");
        return;
      }

      const response = await fetch("/api/cadastro/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, idioma, plano, tutorId, objetivo }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) {
        setError(payload?.error || "Não foi possível salvar seu onboarding.");
        return;
      }

      router.push("/checkout");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar seu onboarding.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-5xl rounded-[2rem] border border-white/10 bg-white/8 p-8 shadow-2xl backdrop-blur md:p-10">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <span className="text-xs font-black uppercase tracking-[0.24em] text-cyan-200">
              SouBilingue · onboarding
            </span>
            <h1 className="mt-3 text-3xl font-black md:text-4xl">Personalize sua jornada</h1>
          </div>
          <span className="rounded-full border border-cyan-300/50 px-4 py-2 text-sm font-bold text-cyan-100">
            Passo 1 de 1
          </span>
        </div>

        {loading ? (
          <div className="rounded-2xl bg-white/10 px-6 py-8 text-center text-slate-200">
            Carregando tutores e escolhas...
          </div>
        ) : (
          <form className="grid gap-8 md:grid-cols-[1fr_420px]" onSubmit={onSubmit}>
            <section className="space-y-8">
              <div className="rounded-[1.8rem] border border-white/20 bg-white/8 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-black text-white">Escolha o idioma</h2>
                  <span className="text-xs font-bold uppercase text-cyan-200">Idioma</span>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {idiomas.map((item) => (
                    <button
                      type="button"
                      key={item.valor}
                      onClick={() => setIdioma(item.valor as Idioma)}
                      className={`rounded-2xl border px-4 py-4 text-left transition ${
                        idioma === item.valor
                          ? "border-cyan-300 bg-cyan-400/30 shadow-lg shadow-cyan-700/20"
                          : "border-white/20 bg-white/5 hover:bg-white/12"
                      }`}
                    >
                      <span className="block text-2xl">{item.bandeira}</span>
                      <span className="mt-2 block text-sm font-bold">{item.nome}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-[1.8rem] border border-white/20 bg-white/8 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-black text-white">Escolha o plano</h2>
                  <span className="text-xs font-bold uppercase text-cyan-200">Plano</span>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {planos.map((item) => (
                    <button
                      type="button"
                      key={item.valor}
                      onClick={() => setPlano(item.valor as Plano)}
                      className={`flex items-center justify-between rounded-2xl border px-4 py-4 text-left transition ${
                        plano === item.valor
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
              </div>

              <div className="rounded-[1.8rem] border border-white/20 bg-white/8 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-black text-white">Escolha seu tutor</h2>
                  <span className="text-xs font-bold uppercase text-cyan-200">Tutor IA</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {tutores.map((tutor) => (
                    <button
                      type="button"
                      key={tutor.id}
                      onClick={() => setTutorId(tutor.id)}
                      className={`overflow-hidden rounded-2xl border text-left transition ${
                        tutorId === tutor.id
                          ? "border-emerald-300 bg-emerald-400/30 ring-2 ring-emerald-100/60"
                          : "border-white/20 bg-white/5 hover:bg-white/12"
                      }`}
                    >
                      <span className="block aspect-[16/10] bg-slate-900/50 p-3">
                        <span className="flex h-full items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-700 text-4xl text-white">
                          {tutor.foto_url ? "" : "🧑‍🏫"}
                        </span>
                      </span>
                      <span className="block px-4 py-3">
                        <span className="block text-sm font-black text-white">{tutor.nome}</span>
                        <span className="mt-1 block text-[11px] leading-4 text-slate-300">{tutor.descricao}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-[1.8rem] border border-white/20 bg-white/8 p-5">
                <div className="mb-3">
                  <label className="text-sm font-black text-white">Objetivo pessoal</label>
                </div>
                <textarea
                  value={objetivo}
                  onChange={(e) => setObjetivo(e.target.value)}
                  rows={4}
                  className="w-full rounded-2xl border border-white/20 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-300 focus:ring-4 focus:ring-cyan-100"
                  placeholder="Ex.: Quiero conversar com mais segurança no trabalho."
                />
              </div>
            </section>

            <aside className="rounded-[1.8rem] border border-white/20 bg-white p-6 text-slate-950 shadow-xl">
              <div className="mb-4">
                <span className="text-xs font-black uppercase tracking-[0.2em] text-violet-700">Resumo</span>
                <h2 className="mt-3 text-2xl font-black">Seu perfil</h2>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Idioma</span>
                  <div className="mt-2 text-lg font-black text-slate-950">
                    {idiomas.find((item) => item.valor === idioma)?.bandeira} {idiomas.find((item) => item.valor === idioma)?.nome}
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Plano</span>
                  <div className="mt-2 text-lg font-black text-slate-950">
                    {planos.find((item) => item.valor === plano)?.nome}
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Tutor</span>
                  <div className="mt-2 text-lg font-black text-slate-950">
                    {tutores.find((item) => item.id === tutorId)?.nome || "Escolha um professor"}
                  </div>
                </div>

                {error && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={saving}
                  className="mt-2 w-full rounded-2xl bg-slate-950 px-5 py-4 text-sm font-black text-white transition hover:bg-violet-800 disabled:opacity-60"
                >
                  {saving ? "Salvando..." : "Salvar meu percurso"}
                </button>
              </div>
            </aside>
          </form>
        )}
      </div>
    </main>
  );
}
