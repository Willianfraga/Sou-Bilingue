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
  const [erro, setErro] = useState<string | null>(
    searchParams.get("erro") === "confirmacao"
      ? "Não foi possível confirmar o e-mail. O link pode ter expirado ou ter sido aberto em outro navegador. Tente entrar com sua senha."
      : null,
  );
  const [enviando, setEnviando] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarRecuperacao, setMostrarRecuperacao] = useState(false);
  const [emailRecuperacao, setEmailRecuperacao] = useState("");
  const [mensagemRecuperacao, setMensagemRecuperacao] = useState<string | null>(null);
  const [enviandoRecuperacao, setEnviandoRecuperacao] = useState(false);

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
        const mensagem = String(error.message || "");
        const erroDeInfra = /failed to fetch|fetch failed|could not resolve host|network|timeout|paused|service unavailable|dns/i.test(mensagem);

        if (erroDeInfra) {
          setErro("O serviço de autenticação está indisponível no momento. Verifique se o projeto Supabase está ativo e tente novamente.");
        } else {
          setErro("E-mail ou senha incorretos.");
        }

        return;
      }

      const destino = searchParams.get("redirect") || "/";
      router.push(destino);
      router.refresh();
    } catch (err) {
      const mensagem = err instanceof Error ? err.message : String(err || "");
      const erroDeInfra = /failed to fetch|fetch failed|could not resolve host|network|timeout|paused|service unavailable|dns/i.test(mensagem);

      if (erroDeInfra) {
        setErro("O serviço de autenticação está indisponível no momento. Verifique se o projeto Supabase está ativo e tente novamente.");
      } else {
        setErro("Não consegui entrar agora. Tenta de novo?");
      }
    } finally {
      setEnviando(false);
    }
  }

  async function enviarRecuperacao() {
    setMensagemRecuperacao(null);

    const emailDestino = (emailRecuperacao.trim() || email.trim()).toLowerCase();
    if (!emailDestino) {
      setMensagemRecuperacao("Informe o e-mail para receber o link de recuperação.");
      return;
    }

    setEnviandoRecuperacao(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.resetPasswordForEmail(emailDestino, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) {
        setMensagemRecuperacao("Não foi possível enviar o link. Verifique o e-mail e tente novamente.");
        return;
      }

      setMensagemRecuperacao("Link de recuperação enviado. Confira sua caixa de entrada.");
      setEmailRecuperacao(emailDestino);
      setMostrarRecuperacao(false);
    } catch {
      setMensagemRecuperacao("Não foi possível enviar o link agora. Tente novamente.");
    } finally {
      setEnviandoRecuperacao(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-[#242057] via-[#4338ca] to-[#7c3aed] px-5 py-10 sm:px-6 sm:py-12">
      <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-cyan-300/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 -left-24 h-80 w-80 rounded-full bg-fuchsia-400/20 blur-3xl" />

      <section className="relative w-full max-w-md rounded-[2rem] border border-white/60 bg-white/95 p-7 shadow-2xl shadow-indigo-950/30 backdrop-blur sm:p-10">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 text-3xl font-black text-white shadow-lg shadow-violet-600/30">
            SB
          </div>
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
          <div className="relative">
            <input
              id="senha"
              type={mostrarSenha ? "text" : "password"}
              required
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              disabled={enviando}
              placeholder="Sua senha"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-11 text-sm outline-none transition focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-100 disabled:opacity-50"
            />
            <button
              type="button"
              aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
              onClick={() => setMostrarSenha(!mostrarSenha)}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full px-2 py-1 text-xs font-bold text-indigo-700 hover:bg-indigo-50"
            >
              {mostrarSenha ? "Ocultar" : "Ver"}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              setMostrarRecuperacao(!mostrarRecuperacao);
              setMensagemRecuperacao(null);
            }}
            className="text-sm font-semibold text-indigo-700 hover:text-indigo-900 underline decoration-indigo-300 underline-offset-4 transition hover:decoration-indigo-700"
          >
            Esqueci minha senha
          </button>
        </div>

        {mostrarRecuperacao && (
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
            <label className="text-xs font-black uppercase tracking-wide text-slate-600">
              Recuperação de senha
            </label>
            <div className="mt-3 flex flex-col gap-3">
              <input
                type="email"
                value={emailRecuperacao || email}
                onChange={(e) => setEmailRecuperacao(e.target.value)}
                disabled={enviandoRecuperacao}
                placeholder="seu@email.com"
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
              />
              <button
                type="button"
                onClick={enviarRecuperacao}
                disabled={enviandoRecuperacao}
                className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:opacity-60"
              >
                {enviandoRecuperacao ? "Enviando..." : "Enviar link"}
              </button>
            </div>
          </div>
        )}

        {mensagemRecuperacao && (
          <p className="rounded-xl bg-blue-50 p-3 text-sm text-blue-700">{mensagemRecuperacao}</p>
        )}

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
