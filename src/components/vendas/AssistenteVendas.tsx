"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import {
  CONVITE,
  LIMITES_ASSISTENTE,
  RESPOSTA_INDISPONIVEL,
  SAUDACAO,
  SUGESTOES,
  type MensagemAssistente,
  type PaginaDoAssistente,
} from "@/lib/vendas/assistente-textos";
import { enviarEvento } from "./Rastreador";

// Assistente de dúvidas (IA) nas páginas de venda. A conversa fica só no
// navegador (sessionStorage) para continuar da página inicial até o
// checkout; o servidor não guarda nada. Convite para conversar aparece uma
// vez por sessão, depois de um tempo na página.

const CHAVE_CONVERSA = "sb:assistente:conversa";
const CHAVE_CONVITE = "sb:assistente:convite";
const CHAVE_ABERTO = "sb:assistente:aberto";
const EVENTO_ABRIR = "sb:abrir-assistente";
const ESPERA_CONVITE_MS = 20_000;

function ler<T>(chave: string, padrao: T): T {
  try {
    const v = sessionStorage.getItem(chave);
    return v ? (JSON.parse(v) as T) : padrao;
  } catch {
    return padrao;
  }
}
function gravar(chave: string, valor: unknown) {
  try {
    sessionStorage.setItem(chave, JSON.stringify(valor));
  } catch {
    // modo privado / bloqueado: segue sem guardar
  }
}

// Só caminhos internos conhecidos viram link (nada de URL vinda do modelo).
const LINKS = /(\/(?:cadastro|checkout|reembolso|contato|termos|privacidade)(?:#[a-z-]+)?)/g;
function TextoComLinks({ texto }: { texto: string }) {
  return (
    <>
      {texto.split(LINKS).map((parte, i) =>
        i % 2 === 1 ? (
          <a key={i} href={parte} className="font-semibold underline decoration-2 underline-offset-2">
            {parte}
          </a>
        ) : (
          <Fragment key={i}>{parte}</Fragment>
        ),
      )}
    </>
  );
}

// Abre o assistente de qualquer lugar da página (ex.: botão na /contato).
export function abrirAssistente() {
  window.dispatchEvent(new Event(EVENTO_ABRIR));
}

export function BotaoAbrirAssistente({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <button type="button" onClick={abrirAssistente} className={className}>
      {children}
    </button>
  );
}

export function AssistenteVendas({ pagina, acimaDoCtaMobile = false }: { pagina: PaginaDoAssistente; acimaDoCtaMobile?: boolean }) {
  const [aberto, setAberto] = useState(false);
  const [convite, setConvite] = useState(false);
  const [mensagens, setMensagens] = useState<MensagemAssistente[]>([]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const listaRef = useRef<HTMLDivElement>(null);
  const campoRef = useRef<HTMLTextAreaElement>(null);
  const botaoRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMensagens(ler<MensagemAssistente[]>(CHAVE_CONVERSA, []));
    if (ler(CHAVE_CONVITE, false)) return;
    const t = window.setTimeout(() => {
      setConvite(true);
      gravar(CHAVE_CONVITE, true);
    }, ESPERA_CONVITE_MS);
    return () => window.clearTimeout(t);
  }, []);

  const abrir = useCallback(() => {
    setAberto(true);
    setConvite(false);
    gravar(CHAVE_CONVITE, true);
    if (!ler(CHAVE_ABERTO, false)) {
      gravar(CHAVE_ABERTO, true);
      enviarEvento("assistente_aberto");
    }
  }, []);

  useEffect(() => {
    window.addEventListener(EVENTO_ABRIR, abrir);
    return () => window.removeEventListener(EVENTO_ABRIR, abrir);
  }, [abrir]);

  useEffect(() => {
    if (!aberto) return;
    campoRef.current?.focus();
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setAberto(false);
        botaoRef.current?.focus();
      }
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [aberto]);

  useEffect(() => {
    listaRef.current?.scrollTo({ top: listaRef.current.scrollHeight, behavior: "smooth" });
  }, [mensagens, enviando, aberto]);

  async function perguntar(pergunta: string) {
    const limpa = pergunta.trim().slice(0, LIMITES_ASSISTENTE.caracteres);
    if (!limpa || enviando) return;
    const nova = [...mensagens, { papel: "cliente" as const, texto: limpa }];
    setMensagens(nova);
    gravar(CHAVE_CONVERSA, nova);
    setTexto("");
    setEnviando(true);
    enviarEvento("assistente_pergunta");
    let resposta = RESPOSTA_INDISPONIVEL;
    try {
      const r = await fetch("/api/assistente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pagina, mensagens: nova }),
      });
      const dados = (await r.json().catch(() => ({}))) as { resposta?: string; erro?: string };
      if (r.ok && dados.resposta) resposta = dados.resposta;
      else if (r.status === 429 && dados.erro) resposta = dados.erro;
    } catch {
      // mantém a resposta de indisponível
    }
    const final = [...nova, { papel: "assistente" as const, texto: resposta }];
    setMensagens(final);
    gravar(CHAVE_CONVERSA, final);
    setEnviando(false);
  }

  function recomecar() {
    setMensagens([]);
    gravar(CHAVE_CONVERSA, []);
    campoRef.current?.focus();
  }

  const posicao = acimaDoCtaMobile ? "bottom-24 md:bottom-6" : "bottom-5 md:bottom-6";

  return (
    <>
      {!aberto && (
        <div className={`fixed right-4 z-50 flex flex-col items-end gap-3 md:right-6 ${posicao}`}>
          {convite && (
            <div className="relative max-w-[260px] rounded-2xl bg-white px-4 py-3 text-sm text-slate-800 shadow-2xl ring-1 ring-violet-100 motion-safe:animate-[vendas-surgir_.4s_ease-out]">
              <button type="button" onClick={abrir} className="text-left font-semibold focus:outline-none">
                {CONVITE}
              </button>
              <button
                type="button"
                onClick={() => setConvite(false)}
                aria-label="Fechar convite"
                className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-xs text-white shadow"
              >
                ✕
              </button>
            </div>
          )}
          <button
            ref={botaoRef}
            type="button"
            onClick={abrir}
            aria-haspopup="dialog"
            aria-expanded={aberto}
            aria-label="Dúvidas? Abrir assistente virtual"
            className="flex h-14 w-14 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 sm:w-auto sm:pl-4 sm:pr-5 font-bold text-white shadow-2xl ring-2 ring-white/70 transition hover:scale-105 focus:outline-none focus-visible:ring-4 focus-visible:ring-fuchsia-300"
          >
            <span aria-hidden className="text-2xl">💬</span>
            <span className="hidden sm:inline">Dúvidas?</span>
          </button>
        </div>
      )}

      {aberto && (
        <section
          role="dialog"
          aria-modal="false"
          aria-labelledby="assistente-titulo"
          className="fixed inset-x-0 bottom-0 z-50 flex h-[85dvh] flex-col overflow-hidden rounded-t-3xl bg-white text-slate-800 shadow-2xl ring-1 ring-violet-100 md:inset-x-auto md:bottom-6 md:right-6 md:h-[600px] md:max-h-[calc(100dvh-3rem)] md:w-[390px] md:rounded-3xl"
        >
          <header className="flex items-center gap-3 bg-gradient-to-r from-indigo-950 via-violet-900 to-fuchsia-900 px-4 py-3 text-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon.svg" alt="" width={36} height={36} className="h-9 w-9" />
            <div className="min-w-0 flex-1">
              <h2 id="assistente-titulo" className="font-black leading-tight">Assistente Sou Bilíngue</h2>
              <p className="text-xs text-violet-200">Respostas automáticas com inteligência artificial</p>
            </div>
            {mensagens.length > 0 && (
              <button type="button" onClick={recomecar} className="rounded-lg px-2 py-1 text-xs text-violet-100 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60">
                Recomeçar
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setAberto(false);
                botaoRef.current?.focus();
              }}
              aria-label="Fechar assistente"
              className="flex h-9 w-9 items-center justify-center rounded-xl hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            >
              ✕
            </button>
          </header>

          <div ref={listaRef} aria-live="polite" className="flex-1 space-y-3 overflow-y-auto bg-[#f6f4ff] px-4 py-4">
            <Balao papel="assistente" texto={SAUDACAO} />
            {mensagens.map((m, i) => (
              <Balao key={i} papel={m.papel} texto={m.texto} />
            ))}
            {enviando && (
              <p className="w-fit rounded-2xl rounded-bl-md bg-white px-4 py-2 text-sm text-slate-500 shadow-sm">
                <span className="motion-safe:animate-pulse">digitando…</span>
              </p>
            )}
            {mensagens.length === 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {SUGESTOES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => perguntar(s)}
                    className="rounded-full bg-white px-3 py-1.5 text-left text-sm font-semibold text-violet-800 shadow-sm ring-1 ring-violet-200 hover:bg-violet-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              perguntar(texto);
            }}
            className="border-t border-violet-100 bg-white p-3"
          >
            <div className="flex items-end gap-2">
              <label htmlFor="assistente-campo" className="sr-only">Sua dúvida</label>
              <textarea
                id="assistente-campo"
                ref={campoRef}
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    perguntar(texto);
                  }
                }}
                rows={1}
                maxLength={LIMITES_ASSISTENTE.caracteres}
                placeholder="Escreva sua dúvida…"
                className="max-h-28 min-h-[44px] flex-1 resize-none rounded-2xl border border-violet-200 px-3 py-2.5 text-base focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200"
              />
              <button
                type="submit"
                disabled={enviando || !texto.trim()}
                className="h-11 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 font-bold text-white disabled:opacity-40 focus:outline-none focus-visible:ring-4 focus-visible:ring-fuchsia-300"
              >
                Enviar
              </button>
            </div>
            <p className="mt-2 text-center text-[11px] text-slate-500">
              Não envie CPF, cartão ou senha. A IA pode errar — as regras oficiais estão em <a href="/termos" className="underline">Termos</a> e{" "}
              <a href="/reembolso" className="underline">Reembolso</a>.
            </p>
          </form>
        </section>
      )}
    </>
  );
}

function Balao({ papel, texto }: MensagemAssistente) {
  const cliente = papel === "cliente";
  return (
    <div className={`flex ${cliente ? "justify-end" : "justify-start"}`}>
      <p
        className={`max-w-[85%] whitespace-pre-line rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed shadow-sm ${
          cliente ? "rounded-br-md bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white" : "rounded-bl-md bg-white text-slate-800"
        }`}
      >
        <span className="sr-only">{cliente ? "Você: " : "Assistente: "}</span>
        <TextoComLinks texto={texto} />
      </p>
    </div>
  );
}
