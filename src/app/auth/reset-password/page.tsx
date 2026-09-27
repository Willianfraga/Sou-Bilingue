"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);

  useEffect(() => {
    const code = searchParams.get("code");
    if (!code) {
      setErro("Link inválido ou expirado. Solicite um novo link de recuperação.");
      return;
    }
    setToken(code);
  }, [searchParams]);

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setMensagem(null);

    if (!token) {
      setErro("Token não encontrado. Link inválido.");
      return;
    }

    if (password.length < 6) {
      setErro("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    if (password !== passwordConfirm) {
      setErro("As senhas não conferem.");
      return;
    }

    setEnviando(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, passwordConfirm }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErro(data.error || "Não foi possível resetar a senha.");
        return;
      }

      setMensagem(data.message || "Senha atualizada com sucesso!");
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (err) {
      setErro(
        err instanceof Error
          ? err.message
          : "Erro ao processar recuperação de senha.",
      );
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
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 text-3xl font-black text-white shadow-lg shadow-violet-600/30">
            SB
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
            Criar nova senha
          </h1>
          <p className="mt-3 text-base font-semibold text-indigo-700">
            Escolha uma senha forte.
          </p>
        </div>

        {!token ? (
          <div className="mt-9 rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-700">{erro}</p>
            <a
              href="/login"
              className="mt-4 inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-indigo-700"
            >
              Voltar para login
            </a>
          </div>
        ) : (
          <form onSubmit={handleResetPassword} className="mt-9 flex flex-col gap-5">
            <div className="flex flex-col gap-1">
              <label htmlFor="password" className="text-sm font-medium">
                Nova Senha
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={mostrarSenha ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={enviando}
                  placeholder="Mínimo 6 caracteres"
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

            <div className="flex flex-col gap-1">
              <label htmlFor="passwordConfirm" className="text-sm font-medium">
                Confirmar Senha
              </label>
              <input
                id="passwordConfirm"
                type={mostrarSenha ? "text" : "password"}
                required
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                disabled={enviando}
                placeholder="Confirme a senha"
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-100 disabled:opacity-50"
              />
            </div>

            {erro && (
              <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
                {erro}
              </p>
            )}

            {mensagem && (
              <p className="rounded-xl bg-green-50 p-3 text-sm text-green-700">
                {mensagem}
              </p>
            )}

            <button
              type="submit"
              disabled={enviando}
              className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-4 text-sm font-black text-white shadow-lg shadow-violet-500/25 transition hover:-translate-y-0.5 hover:from-indigo-700 hover:to-violet-700 disabled:translate-y-0 disabled:opacity-50"
            >
              {enviando ? "Salvando..." : "Salvar nova senha"}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
