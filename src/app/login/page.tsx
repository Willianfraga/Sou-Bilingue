"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

// Login por e-mail/senha — decisão pragmática (não magic link) pra não
// depender de configuração de e-mail funcionando ainda. Cadastro público
// continua adiado (mesma decisão de página de vendas/checkout); as únicas
// contas que existem hoje são as de teste (scripts/seed-usuarios-teste.mjs).
function FormularioDeLogin() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: senha,
      });

      if (error) {
        setErro("E-mail ou senha incorretos.");
        return;
      }

      const destino = searchParams.get("redirect") || "/";
      router.push(destino);
      router.refresh();
    } catch {
      setErro("Não consegui entrar agora. Tenta de novo?");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-[#242057] via-[#4338ca] to-[#7c3aed] px-5 py-10 sm:px-6 sm:py-12">
      <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-cyan-300/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 -left-24 h-80 w-80 rounded-full bg-fuchsia-400/20 blur-3xl" />

      <section className="relative w-full max-w-md rounded-[2rem] border border-white/60 bg-white/95 p-7 shadow-2xl shadow-indigo-950/30 backdrop-blur sm:p-10">
        <div className="text-center">
          <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
            Faça seu login
          </h1>
          <p className="mt-3 text-base font-semibold text-indigo-700">
            Seu melhor professor está aqui.
          </p>
        </div>

      <form onSubmit={entrar} className="mt-9 flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <label htmlFor="email" className="text-sm font-medium">
            E-mail
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={enviando}
            placeholder="voce@exemplo.com"
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-100 disabled:opacity-50"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="senha" className="text-sm font-medium">
            Senha
          </label>
          <input
            id="senha"
            type="password"
            required
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            disabled={enviando}
            placeholder="Sua senha"
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-100 disabled:opacity-50"
          />
        </div>

        {erro && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{erro}</p>}

        <button
          type="submit"
          disabled={enviando}
          className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-4 text-sm font-black text-white shadow-lg shadow-violet-500/25 transition hover:-translate-y-0.5 hover:from-indigo-700 hover:to-violet-700 disabled:translate-y-0 disabled:opacity-50"
        >
          {enviando ? "Entrando..." : "Fazer login"}
        </button>
      </form>
      </section>
    </main>
  );
}

export default function Login() {
  return (
    <Suspense>
      <FormularioDeLogin />
    </Suspense>
  );
}
