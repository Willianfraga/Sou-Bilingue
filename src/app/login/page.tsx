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
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f7f5ef] px-6 py-12">
      <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-orange-200/50 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 -left-24 h-80 w-80 rounded-full bg-emerald-200/50 blur-3xl" />

      <section className="relative w-full max-w-md rounded-[2rem] border border-black/5 bg-white p-7 shadow-2xl shadow-emerald-950/10 sm:p-10">
        <div className="text-center">
          <a href="/" className="inline-flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#17201d] text-sm font-black text-white">
              SB
            </span>
            <span className="text-3xl font-black tracking-[-0.04em] text-[#17201d]">
              Sou Bilíngue
            </span>
          </a>
          <p className="mt-5 text-sm font-bold uppercase tracking-[0.18em] text-[#ff6b4a]">
            Já sou aluno
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-[#17201d]">
            Faça seu login
          </h1>
          <p className="mt-3 text-base font-medium text-[#66706c]">
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
            className="rounded-xl border border-[#d8d7d1] bg-[#faf9f6] px-4 py-3 text-sm outline-none transition focus:border-[#ff6b4a] focus:ring-4 focus:ring-orange-100 disabled:opacity-50"
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
            className="rounded-xl border border-[#d8d7d1] bg-[#faf9f6] px-4 py-3 text-sm outline-none transition focus:border-[#ff6b4a] focus:ring-4 focus:ring-orange-100 disabled:opacity-50"
          />
        </div>

        {erro && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{erro}</p>}

        <button
          type="submit"
          disabled={enviando}
          className="rounded-full bg-[#17201d] px-5 py-4 text-sm font-black text-white shadow-lg shadow-emerald-950/15 transition hover:-translate-y-0.5 hover:bg-[#263b35] disabled:translate-y-0 disabled:opacity-50"
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
