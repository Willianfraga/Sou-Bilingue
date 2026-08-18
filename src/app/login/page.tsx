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
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-6">
      <div>
        <span className="font-mono text-xs uppercase tracking-widest text-amber-700">
          SouBilingue
        </span>
        <h1 className="mt-1 text-2xl font-bold">Entrar</h1>
      </div>

      <form onSubmit={entrar} className="flex flex-col gap-4">
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
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm disabled:opacity-50"
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
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm disabled:opacity-50"
          />
        </div>

        {erro && <p className="text-sm text-red-600">{erro}</p>}

        <button
          type="submit"
          disabled={enviando}
          className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {enviando ? "Entrando..." : "Entrar"}
        </button>
      </form>
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
