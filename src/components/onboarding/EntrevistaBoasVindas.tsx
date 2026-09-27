"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type RefObject } from "react";
import { useRouter } from "next/navigation";
import {
  PERGUNTAS,
  PREFIRO_NAO_RESPONDER,
  rotuloDaOpcao,
  validarResposta,
  type ChavePergunta,
  type Pergunta,
  type Respostas,
  type ValorResposta,
} from "@/lib/onboarding/questionario";
import { TEXTOS_ENTREVISTA as T } from "@/lib/onboarding/textos";
import type { ModoEntrevista } from "@/lib/onboarding/fluxo";

type Props = {
  modo: ModoEntrevista;
  tutorNome: string;
  tutorFoto?: string | null;
  respostasIniciais: Respostas;
  etapaInicial: number;
  // Identifica o rascunho local deste aluno no navegador (reserva caso a
  // rede falhe); o rascunho oficial fica no servidor.
  chaveLocal: string;
  destinoAoConcluir: string;
};

type StatusRascunho = "ocioso" | "salvando" | "salvo" | "falhou";

const TOTAL = PERGUNTAS.length;
const CHAVE_STORAGE = (chave: string) => `soubilingue:entrevista:${chave}`;

function lerLocal(chave: string): { respostas: Respostas; etapa: number } | null {
  try {
    const bruto = window.localStorage.getItem(CHAVE_STORAGE(chave));
    return bruto ? JSON.parse(bruto) : null;
  } catch {
    return null;
  }
}

function gravarLocal(chave: string, respostas: Respostas, etapa: number) {
  try {
    window.localStorage.setItem(CHAVE_STORAGE(chave), JSON.stringify({ respostas, etapa }));
  } catch {
    // modo privado / armazenamento bloqueado: o rascunho do servidor basta
  }
}

function apagarLocal(chave: string) {
  try {
    window.localStorage.removeItem(CHAVE_STORAGE(chave));
  } catch {
    // idem
  }
}

function formatarResposta(pergunta: Pergunta, valor: ValorResposta | undefined): string {
  if (valor === undefined || (Array.isArray(valor) && valor.length === 0) || valor === "") return T.semResposta;
  if (valor === PREFIRO_NAO_RESPONDER) return T.prefiroNao;
  if (pergunta.tipo === "texto") return String(valor);
  const valores = Array.isArray(valor) ? valor : [valor];
  return valores.map((v) => rotuloDaOpcao(pergunta.id, v)).join(", ");
}

export function EntrevistaBoasVindas({
  modo,
  tutorNome,
  tutorFoto,
  respostasIniciais,
  etapaInicial,
  chaveLocal,
  destinoAoConcluir,
}: Props) {
  const router = useRouter();
  const [respostas, setRespostas] = useState<Respostas>(respostasIniciais);
  const [etapa, setEtapa] = useState(etapaInicial);
  const [voltarAoResumo, setVoltarAoResumo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [errosServidor, setErrosServidor] = useState<Partial<Record<ChavePergunta, string>>>({});
  const [status, setStatus] = useState<StatusRascunho>("ocioso");
  const [enviando, setEnviando] = useState(false);
  const tituloRef = useRef<HTMLHeadingElement>(null);
  const campoRef = useRef<HTMLElement | null>(null);
  const primeiraRenderizacao = useRef(true);

  const naRevisao = etapa >= TOTAL;
  const pergunta = naRevisao ? null : PERGUNTAS[etapa];
  const valorAtual = pergunta ? respostas[pergunta.id] : undefined;

  // Reserva local: se o navegador tem progresso mais adiantado que o servidor
  // (ex.: a rede caiu no último salvamento), retoma dele.
  useEffect(() => {
    const local = lerLocal(chaveLocal);
    if (local && typeof local.etapa === "number" && local.etapa > etapaInicial && modo === "novo") {
      setRespostas({ ...respostasIniciais, ...local.respostas });
      setEtapa(Math.min(local.etapa, TOTAL));
    }
    // só na montagem
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Salvamento automático do rascunho (servidor + reserva local).
  useEffect(() => {
    if (primeiraRenderizacao.current) {
      primeiraRenderizacao.current = false;
      return;
    }
    gravarLocal(chaveLocal, respostas, etapa);
    setStatus("salvando");
    const timer = window.setTimeout(async () => {
      try {
        const resposta = await fetch("/api/onboarding", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rascunho: respostas, etapa }),
        });
        setStatus(resposta.ok ? "salvo" : "falhou");
      } catch {
        setStatus("falhou");
      }
    }, 700);
    return () => window.clearTimeout(timer);
  }, [respostas, etapa, chaveLocal]);

  // Foco no título a cada troca de etapa: leitor de tela anuncia a pergunta
  // nova e o teclado continua a partir dela.
  useEffect(() => {
    tituloRef.current?.focus();
  }, [etapa]);

  const responder = useCallback(
    (valor: ValorResposta | undefined) => {
      if (!pergunta) return;
      setErro(null);
      setRespostas((atuais) => {
        const novas = { ...atuais };
        if (valor === undefined) delete novas[pergunta.id];
        else novas[pergunta.id] = valor;
        return novas;
      });
    },
    [pergunta],
  );

  function avancar() {
    if (!pergunta) return;
    const resultado = validarResposta(pergunta, valorAtual);
    if (!resultado.ok) {
      setErro(resultado.erro);
      campoRef.current?.focus();
      return;
    }
    setErro(null);
    if (voltarAoResumo) {
      setVoltarAoResumo(false);
      setEtapa(TOTAL);
    } else {
      setEtapa((e) => Math.min(e + 1, TOTAL));
    }
  }

  function voltar() {
    setErro(null);
    setEtapa((e) => Math.max(e - 1, 0));
  }

  function irPara(indice: number) {
    setErro(null);
    setVoltarAoResumo(true);
    setEtapa(indice);
  }

  async function concluir() {
    setEnviando(true);
    setErro(null);
    setErrosServidor({});
    try {
      const resposta = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ respostas }),
      });
      const corpo = await resposta.json().catch(() => null);
      if (!resposta.ok || !corpo?.success) {
        setErrosServidor(corpo?.erros ?? {});
        setErro(corpo?.error ?? T.erroGenerico);
        return;
      }
      apagarLocal(chaveLocal);
      router.push(destinoAoConcluir);
      router.refresh();
    } catch {
      setErro(T.erroGenerico);
    } finally {
      setEnviando(false);
    }
  }

  const idTitulo = "entrevista-pergunta";
  const idAjuda = "entrevista-ajuda";
  const idErro = "entrevista-erro";
  const descricao = [pergunta?.ajuda ? idAjuda : null, erro ? idErro : null].filter(Boolean).join(" ") || undefined;
  const prefiroNao = valorAtual === PREFIRO_NAO_RESPONDER;
  const vazio =
    valorAtual === undefined || valorAtual === "" || (Array.isArray(valorAtual) && valorAtual.length === 0);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-950 px-4 py-8 text-white sm:px-6 sm:py-12">
      <div className="mx-auto max-w-2xl">
        <header className="mb-6">
          <span className="text-xs font-black uppercase tracking-[0.24em] text-cyan-200">{T.selo}</span>
          <h1 className="mt-3 text-2xl font-black sm:text-3xl">
            {modo === "editar" ? T.tituloEditar : T.tituloNovo(tutorNome)}
          </h1>
          <p className="mt-2 text-sm text-slate-300">{T.subtitulo}</p>
        </header>

        <div className="mb-5">
          <div className="mb-2 flex items-center justify-between text-sm font-bold">
            <span className="text-cyan-100">{naRevisao ? T.revisao : T.progresso(etapa + 1, TOTAL)}</span>
            <span aria-live="polite" className="text-xs font-semibold text-slate-400">
              {status === "salvando" ? T.rascunhoSalvando : status === "salvo" ? T.rascunhoSalvo : status === "falhou" ? T.rascunhoFalhou : ""}
            </span>
          </div>
          <div
            role="progressbar"
            aria-label="Progresso da entrevista"
            aria-valuemin={0}
            aria-valuemax={TOTAL}
            aria-valuenow={Math.min(etapa, TOTAL)}
            className="h-2 overflow-hidden rounded-full bg-white/15"
          >
            <div
              className="h-full rounded-full bg-cyan-300 transition-all duration-300"
              style={{ width: `${(Math.min(etapa + (naRevisao ? 0 : 1), TOTAL) / TOTAL) * 100}%` }}
            />
          </div>
        </div>

        <section className="rounded-[2rem] border border-white/10 bg-white/[0.08] p-5 shadow-2xl backdrop-blur sm:p-8">
          <div className="mb-5 flex items-start gap-3">
            {tutorFoto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={tutorFoto} alt="" className="h-12 w-12 shrink-0 rounded-full bg-indigo-900 object-cover object-top ring-2 ring-cyan-300/60" />
            ) : (
              <span aria-hidden className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-cyan-300 text-lg font-black text-slate-950">
                {tutorNome.slice(0, 1)}
              </span>
            )}
            <div className="min-w-0 flex-1 rounded-2xl rounded-tl-sm bg-white px-4 py-3 text-slate-900 shadow-lg">
              <p className="text-xs font-bold uppercase tracking-wide text-violet-700">{T.perguntaDoTutor(tutorNome)}</p>
              <h2 id={idTitulo} ref={tituloRef} tabIndex={-1} className="mt-1 text-lg font-black leading-snug outline-none sm:text-xl">
                {naRevisao ? T.tituloResumo : pergunta?.titulo}
              </h2>
              {!naRevisao && pergunta?.ajuda && (
                <p id={idAjuda} className="mt-1 text-sm text-slate-600">
                  {pergunta.ajuda}
                </p>
              )}
              {naRevisao && <p className="mt-1 text-sm text-slate-600">{T.textoResumo}</p>}
            </div>
          </div>

          {pergunta && (
            <div className="space-y-3">
              {!pergunta.obrigatoria && (
                <span className="inline-block rounded-full border border-cyan-300/40 px-3 py-1 text-xs font-bold uppercase text-cyan-100">
                  {T.opcional}
                </span>
              )}
              <Campo
                pergunta={pergunta}
                valor={valorAtual}
                desabilitado={prefiroNao}
                idTitulo={idTitulo}
                descricao={descricao}
                invalido={Boolean(erro)}
                campoRef={campoRef}
                onChange={responder}
                onEnter={avancar}
              />
              {pergunta.pessoal && (
                <button
                  type="button"
                  aria-pressed={prefiroNao}
                  onClick={() => responder(prefiroNao ? undefined : PREFIRO_NAO_RESPONDER)}
                  className={`rounded-full border px-4 py-2 text-sm font-bold transition focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-300/60 ${
                    prefiroNao ? "border-cyan-300 bg-cyan-300 text-slate-950" : "border-white/30 text-slate-200 hover:bg-white/10"
                  }`}
                >
                  {T.prefiroNao}
                </button>
              )}
            </div>
          )}

          {naRevisao && (
            <ul className="space-y-2">
              {PERGUNTAS.map((p, i) => (
                <li
                  key={p.id}
                  className={`flex items-start justify-between gap-3 rounded-2xl border px-4 py-3 ${
                    errosServidor[p.id] ? "border-rose-300 bg-rose-500/10" : "border-white/15 bg-white/5"
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block text-xs font-bold uppercase tracking-wide text-slate-400">{p.titulo}</span>
                    <span className="mt-1 block break-words text-sm font-bold text-white">{formatarResposta(p, respostas[p.id])}</span>
                    {errosServidor[p.id] && <span className="mt-1 block text-xs font-bold text-rose-200">{errosServidor[p.id]}</span>}
                  </span>
                  <button
                    type="button"
                    onClick={() => irPara(i)}
                    aria-label={`${T.alterar}: ${p.titulo}`}
                    className="shrink-0 rounded-full bg-white/10 px-3 py-2 text-xs font-black text-cyan-100 hover:bg-white/20 focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-300/60"
                  >
                    {T.alterar}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {erro && (
            <p id={idErro} role="alert" className="mt-4 rounded-xl border border-rose-300/60 bg-rose-500/15 px-4 py-3 text-sm font-bold text-rose-100">
              {erro}
            </p>
          )}

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
            <button
              type="button"
              onClick={voltar}
              disabled={etapa === 0 || enviando}
              className="rounded-xl border border-white/25 px-5 py-3 text-sm font-black text-white transition hover:bg-white/10 focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-300/60 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {T.voltar}
            </button>
            {naRevisao ? (
              <button
                type="button"
                onClick={concluir}
                disabled={enviando}
                className="rounded-xl bg-cyan-300 px-6 py-3 text-sm font-black text-slate-950 transition hover:bg-cyan-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-white/70 disabled:opacity-60"
              >
                {enviando ? T.enviando : modo === "editar" ? T.concluirEdicao : T.concluir}
              </button>
            ) : (
              <button
                type="button"
                onClick={avancar}
                className="rounded-xl bg-cyan-300 px-6 py-3 text-sm font-black text-slate-950 transition hover:bg-cyan-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-white/70"
              >
                {voltarAoResumo ? T.voltarAoResumo : etapa === TOTAL - 1 ? T.revisar : vazio && !pergunta?.obrigatoria ? T.pular : T.continuar}
              </button>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

type CampoProps = {
  pergunta: Pergunta;
  valor: ValorResposta | undefined;
  desabilitado: boolean;
  idTitulo: string;
  descricao?: string;
  invalido: boolean;
  campoRef: RefObject<HTMLElement | null>;
  onChange: (valor: ValorResposta | undefined) => void;
  onEnter: () => void;
};

const OPCAO_BASE =
  "flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-bold transition peer-focus-visible:ring-4 peer-focus-visible:ring-cyan-300/60";

function Campo({ pergunta, valor, desabilitado, idTitulo, descricao, invalido, campoRef, onChange, onEnter }: CampoProps) {
  if (pergunta.tipo === "texto") {
    const texto = typeof valor === "string" && valor !== PREFIRO_NAO_RESPONDER ? valor : "";
    const max = pergunta.max ?? 200;
    const comum = {
      id: `campo-${pergunta.id}`,
      value: texto,
      maxLength: max,
      disabled: desabilitado,
      placeholder: pergunta.placeholder,
      "aria-labelledby": idTitulo,
      "aria-describedby": descricao,
      "aria-invalid": invalido || undefined,
      className:
        "w-full rounded-2xl border border-white/20 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-cyan-300 focus:ring-4 focus:ring-cyan-100 disabled:opacity-50",
    };
    return (
      <div>
        {max > 60 ? (
          <textarea
            {...comum}
            ref={(el) => {
              campoRef.current = el;
            }}
            rows={3}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e: KeyboardEvent) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) onEnter();
            }}
          />
        ) : (
          <input
            {...comum}
            ref={(el) => {
              campoRef.current = el;
            }}
            type="text"
            autoComplete={pergunta.id === "nomePreferido" ? "nickname" : "off"}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e: KeyboardEvent) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onEnter();
              }
            }}
          />
        )}
        <p className="mt-1 text-right text-xs text-slate-400">{`${texto.length}/${max}`}</p>
      </div>
    );
  }

  const opcoes = pergunta.opcoes ?? [];

  if (pergunta.tipo === "unica" || pergunta.tipo === "escala") {
    const escala = pergunta.tipo === "escala";
    return (
      <fieldset aria-labelledby={idTitulo} aria-describedby={descricao} disabled={desabilitado} className="disabled:opacity-50">
        <div className={escala ? "grid grid-cols-1 gap-2 sm:grid-cols-5" : "grid gap-2 sm:grid-cols-2"}>
          {opcoes.map((opcao, i) => {
            const marcado = valor === opcao.valor;
            const id = `campo-${pergunta.id}-${opcao.valor}`;
            return (
              <div key={opcao.valor}>
                <input
                  ref={(el) => {
                    if (i === 0) campoRef.current = el;
                  }}
                  id={id}
                  type="radio"
                  name={pergunta.id}
                  value={opcao.valor}
                  checked={marcado}
                  onChange={() => onChange(opcao.valor)}
                  className="peer sr-only"
                />
                <label
                  htmlFor={id}
                  className={`${OPCAO_BASE} ${escala ? "h-full flex-row sm:flex-col sm:justify-center sm:text-center" : ""} ${
                    marcado ? "border-cyan-300 bg-cyan-300/15 text-white" : "border-white/20 bg-white/5 text-slate-200 hover:bg-white/10"
                  }`}
                >
                  {escala ? (
                    <span
                      aria-hidden
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black ${
                        marcado ? "bg-cyan-300 text-slate-950" : "bg-white/15 text-white"
                      }`}
                    >
                      {i + 1}
                    </span>
                  ) : (
                    <span
                      aria-hidden
                      className={`h-4 w-4 shrink-0 rounded-full border-2 ${marcado ? "border-cyan-300 bg-cyan-300" : "border-white/50"}`}
                    />
                  )}
                  {opcao.rotulo}
                </label>
              </div>
            );
          })}
        </div>
      </fieldset>
    );
  }

  // multipla
  const selecionados = Array.isArray(valor) ? valor : [];
  const max = pergunta.max ?? opcoes.length;
  const noLimite = selecionados.length >= max;
  return (
    <fieldset aria-labelledby={idTitulo} aria-describedby={descricao} disabled={desabilitado} className="disabled:opacity-50">
      <div className="grid gap-2 sm:grid-cols-2">
        {opcoes.map((opcao, i) => {
          const marcado = selecionados.includes(opcao.valor);
          const bloqueado = !marcado && noLimite;
          const id = `campo-${pergunta.id}-${opcao.valor}`;
          return (
            <div key={opcao.valor}>
              <input
                ref={(el) => {
                  if (i === 0) campoRef.current = el;
                }}
                id={id}
                type="checkbox"
                value={opcao.valor}
                checked={marcado}
                disabled={bloqueado}
                onChange={() =>
                  onChange(
                    marcado ? selecionados.filter((v) => v !== opcao.valor) : [...selecionados, opcao.valor],
                  )
                }
                className="peer sr-only"
              />
              <label
                htmlFor={id}
                className={`${OPCAO_BASE} ${
                  marcado
                    ? "border-cyan-300 bg-cyan-300/15 text-white"
                    : bloqueado
                      ? "cursor-not-allowed border-white/10 text-slate-500"
                      : "border-white/20 bg-white/5 text-slate-200 hover:bg-white/10"
                }`}
              >
                <span
                  aria-hidden
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 text-[10px] ${
                    marcado ? "border-cyan-300 bg-cyan-300 text-slate-950" : "border-white/50"
                  }`}
                >
                  {marcado ? "✓" : ""}
                </span>
                {opcao.rotulo}
              </label>
            </div>
          );
        })}
      </div>
      {noLimite && max < opcoes.length && (
        <p className="mt-2 text-xs font-semibold text-cyan-100" aria-live="polite">
          {T.maximoAtingido(max)}
        </p>
      )}
    </fieldset>
  );
}
