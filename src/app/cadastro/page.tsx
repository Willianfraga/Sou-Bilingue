"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function CadastroPage() {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  // Quem chega aqui já logado e sem profile (e-mail confirmado em outro
  // navegador, por exemplo — o middleware manda para cá) não pode refazer o
  // signUp: conclui o profile com o nome informado no cadastro.
  useEffect(() => {
    let ativo = true;
    (async () => {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const nomeSalvo = String(user?.user_metadata?.nome ?? "").trim();
      if (!ativo || !user || nomeSalvo.length < 2) return;

      const resposta = await fetch("/api/cadastro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: nomeSalvo }),
      });
      if (ativo && resposta.ok) router.replace("/checkout");
    })().catch(() => {});
    return () => {
      ativo = false;
    };
  }, [router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setMensagem(null);

    if (nome.trim().length < 2) {
      setErro("Informe o nome completo para continuar.");
      return;
    }

    if (senha.length < 6) {
      setErro("A senha deve ter ao menos 6 caracteres.");
      return;
    }

    setEnviando(true);

    try {
      const supabase = createSupabaseBrowserClient();

      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password: senha,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            nome,
            papel: "aluno",
          },
        },
      });

      if (error) {
        setErro(error.message || "Não foi possível criar sua conta.");
        return;
      }

      if (data?.user?.identities?.length === 0) {
        setErro("Esse e-mail já está cadastrado. Faça login ou recupere a senha.");
        return;
      }

      // Confirmação de e-mail ligada: sem sessão ainda. O profile é criado em
      // /auth/callback quando a pessoa clicar no link do e-mail.
      if (!data.session) {
        setMensagem(
          "Enviamos um link de confirmação para o seu e-mail. Abra o link neste mesmo navegador para continuar.",
        );
        return;
      }

      // SEGURANÇA: Servidor determina userId via sessão autenticada, nunca enviamos do cliente
      const perfilResponse = await fetch("/api/cadastro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome,
        }),
      });

      const perfilPayload = await perfilResponse.json().catch(() => null);

      if (!perfilResponse.ok || !perfilPayload?.success) {
        setErro(perfilPayload?.error || "Conta criada, mas o perfil do aluno não pôde ser salvo.");
        return;
      }

      setMensagem("Conta criada! Agora é só escolher o pagamento.");
      setTimeout(() => router.push("/checkout"), 500);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível criar sua conta.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-950 px-6 py-12 text-white">
      <div className="mx-auto max-w-5xl rounded-[2rem] border border-white/10 bg-white/8 p-8 shadow-2xl backdrop-blur md:p-12">
        <div className="grid gap-10 md:grid-cols-[1fr_420px] md:items-center">
          <section className="space-y-8">
            <div className="inline-flex items-center rounded-full border border-cyan-300/40 bg-cyan-400/10 px-4 py-2 text-sm font-bold text-cyan-200">
              SouBilingue · Cadastro
            </div>
            <div className="space-y-4">
              <h1 className="text-4xl font-black leading-tight md:text-5xl">
                Comece a falar com confiança.
              </h1>
              <p className="max-w-xl text-slate-300">
                Crie sua conta e receba aulas guiadas por IA com foco em conversa real.
              </p>
            </div>

            <div className="grid gap-3 text-sm text-slate-300">
              <div className="flex items-center gap-3">
                <span className="h-2 w-2 rounded-full bg-emerald-300" /> Conversas com tutor de IA
              </div>
              <div className="flex items-center gap-3">
                <span className="h-2 w-2 rounded-full bg-emerald-300" /> Plano semanal adaptado ao seu ritmo
              </div>
              <div className="flex items-center gap-3">
                <span className="h-2 w-2 rounded-full bg-emerald-300" /> Certificação automática mensal
              </div>
            </div>
          </section>

          <section className="rounded-[1.75rem] border border-white/20 bg-white p-7 text-slate-950 shadow-xl">
            <div className="mb-6 text-center">
              <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-2xl font-black text-white">
                SB
              </span>
              <h2 className="mt-4 text-2xl font-black">Criar conta</h2>
            </div>

            <form className="space-y-4" onSubmit={onSubmit}>
              <div>
                <label htmlFor="nome" className="mb-2 block text-sm font-bold text-slate-700">
                  Nome completo
                </label>
                <input
                  id="nome"
                  type="text"
                  required
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-violet-600 focus:ring-4 focus:ring-violet-100"
                  placeholder="Seu nome"
                />
              </div>

              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-bold text-slate-700">
                  E-mail
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-violet-600 focus:ring-4 focus:ring-violet-100"
                  placeholder="voce@exemplo.com"
                />
              </div>

              <div>
                <label htmlFor="senha" className="mb-2 block text-sm font-bold text-slate-700">
                  Senha
                </label>
                <input
                  id="senha"
                  type="password"
                  required
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-violet-600 focus:ring-4 focus:ring-violet-100"
                  placeholder="Mínimo 6 caracteres"
                />
              </div>

              {erro && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                  {erro}
                </div>
              )}

              {mensagem && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                  {mensagem}
                </div>
              )}

              <button
                type="submit"
                disabled={enviando}
                className="w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white transition hover:bg-violet-800 disabled:opacity-60"
              >
                {enviando ? "Criando conta..." : "Criar minha conta"}
              </button>

              <p className="text-center text-sm text-slate-500">
                Já tem conta? <a className="font-bold text-violet-700" href="/login">Entrar</a>
              </p>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}
