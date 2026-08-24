"use client";

import { useRef, useState, useEffect } from "react";
import Image from "next/image";

type Mensagem = { role: "user" | "assistant"; content: string; lida?: boolean };
type Estado = "pronta" | "falando" | "ouvindo" | "pensando" | "pausada" | "erro";

// O navegador pede acesso ao microfone apenas na primeira aula. Depois de
// iniciada, a conversa segue sozinha: tutor fala, aluno responde, tutor fala.
export function AulaChat({
  tituloTutor,
  idiomaDaVoz,
  fotoTutor,
  temaInicial,
}: {
  tituloTutor: string;
  idiomaDaVoz: string;
  fotoTutor?: string;
  temaInicial?: string;
}) {
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [estado, setEstado] = useState<Estado>("pronta");
  const [erro, setErro] = useState("");
  const mensagensRef = useRef<Mensagem[]>([]);
  const recognitionRef = useRef<any>(null);
  const ativaRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chatRef = useRef<HTMLDivElement>(null);

  function atualizarMensagens(proximas: Mensagem[]) {
    mensagensRef.current = proximas;
    setMensagens(proximas);
  }

  useEffect(() => {
    // Auto-scroll para a última mensagem
    if (chatRef.current) {
      setTimeout(() => {
        chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
      }, 100);
    }
  }, [mensagens]);

  function pararReconhecimento() {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
  }

  function encerrar() {
    ativaRef.current = false;
    pararReconhecimento();
    window.speechSynthesis?.cancel();
    audioRef.current?.pause();
    audioRef.current = null;
    setEstado("pausada");
  }

  function ouvir() {
    if (!ativaRef.current) return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setErro("Seu navegador nao oferece reconhecimento de voz. Use Chrome ou Edge para a conversa automatica.");
      setEstado("erro");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = idiomaDaVoz;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognitionRef.current = recognition;
    let textoFinal = "";
    setEstado("ouvindo");

    recognition.onresult = (evento: any) => {
      let parcial = "";
      for (let i = evento.resultIndex; i < evento.results.length; i += 1) {
        const trecho = evento.results[i][0].transcript;
        if (evento.results[i].isFinal) textoFinal += trecho;
        else parcial += trecho;
      }
      if (parcial) setErro(`Ouvindo: ${parcial}`);
    };
    recognition.onerror = (evento: any) => {
      if (evento.error === "aborted" || !ativaRef.current) return;
      setErro("Nao consegui entender. Pode falar novamente quando o microfone abrir.");
      setEstado("pausada");
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      setErro("");
      if (ativaRef.current && textoFinal.trim()) void responder(textoFinal.trim());
    };
    recognition.start();
  }

  function falarNoNavegador(texto: string) {
    if (!ativaRef.current) return;
    if (!window.speechSynthesis) {
      ouvir();
      return;
    }
    setEstado("falando");
    window.speechSynthesis.cancel();
    const fala = new SpeechSynthesisUtterance(texto);
    fala.lang = idiomaDaVoz;
    fala.rate = 0.95;
    fala.onend = () => ouvir();
    fala.onerror = () => ouvir();
    window.speechSynthesis.speak(fala);
  }

  async function falar(texto: string) {
    if (!ativaRef.current) return;
    setEstado("falando");
    window.speechSynthesis?.cancel();
    audioRef.current?.pause();

    try {
      const resposta = await fetch("/api/aula/voz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto }),
      });
      if (!resposta.ok) throw new Error("Voz premium indisponível");

      const url = URL.createObjectURL(await resposta.blob());
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => {
        URL.revokeObjectURL(url);
        audioRef.current = null;
        ouvir();
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        audioRef.current = null;
        falarNoNavegador(texto);
      };
      await audio.play();
    } catch {
      falarNoNavegador(texto);
    }
  }

  async function responder(texto: string) {
    if (!ativaRef.current) return;
    const proximas = [...mensagensRef.current, { role: "user" as const, content: texto }];
    atualizarMensagens(proximas);
    setEstado("pensando");

    try {
      const resposta = await fetch("/api/aula/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mensagens: proximas, tema: temaInicial }),
      });
      if (!resposta.ok || !resposta.body) throw new Error("Falha no tutor");

      let respostaCompleta = "";
      const reader = resposta.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        respostaCompleta += decoder.decode(value, { stream: true });
        setMensagens([...proximas, { role: "assistant", content: respostaCompleta }]);
      }
      const finalizadas = [...proximas, { role: "assistant" as const, content: respostaCompleta }];
      atualizarMensagens(finalizadas);
      await falar(respostaCompleta);
    } catch {
      setErro("A tutora nao conseguiu responder agora. Tente continuar em alguns instantes.");
      setEstado("erro");
    }
  }

  async function iniciar() {
    setErro("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      ativaRef.current = true;
      await responder(
        temaInicial
          ? `Quero praticar este tema: ${temaInicial}. Ajude-me de forma leve e conversacional.`
          : "Quero uma conversa livre. Pergunte o que eu gostaria de aprender hoje.",
      );
    } catch {
      setErro("Precisamos do acesso ao microfone para iniciar a conversa automatica.");
      setEstado("erro");
    }
  }

  const descricaoEstado: Record<Estado, string> = {
    pronta: "A tutora vai falar primeiro.",
    falando: "A tutora esta falando...",
    ouvindo: "Estou ouvindo voce...",
    pensando: "A tutora esta preparando a resposta...",
    pausada: "Conversa pausada.",
    erro: "Precisamos de um ajuste para continuar.",
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-slate-50 to-white">
      {/* HEADER COM AVATAR E TUTOR */}
      <section className="overflow-hidden rounded-b-2xl bg-gradient-to-br from-[#2c3e60] via-[#536ec8] to-[#6f85d9] px-4 sm:px-6 pt-4 sm:pt-6 pb-6 sm:pb-8 text-white shadow-lg md:rounded-b-[2rem]">
        <div className="mx-auto max-w-2xl">
          <div className="mb-4 flex items-center justify-between gap-2">
            <span className="rounded-full bg-white/15 px-2.5 py-1 text-xs sm:text-xs font-semibold backdrop-blur">Conversa continua</span>
            <button
              type="button"
              onClick={encerrar}
              className="rounded-full bg-white/15 px-2.5 py-1 text-xs sm:text-xs font-semibold backdrop-blur hover:bg-white/25 transition active:scale-95"
            >
              Encerrar
            </button>
          </div>

          <div className="flex flex-col items-center text-center">
            {/* AVATAR DA TUTORA */}
            <div className="relative mb-3 sm:mb-4">
              {fotoTutor ? (
                <div className="relative h-24 w-24 sm:h-32 sm:w-32 overflow-hidden rounded-2xl sm:rounded-3xl border-4 border-white/30 shadow-lg sm:shadow-xl">
                  <Image
                    src={fotoTutor}
                    alt={tituloTutor}
                    fill
                    className="object-cover"
                    priority
                  />
                </div>
              ) : (
                <div className="flex h-24 w-24 sm:h-32 sm:w-32 items-center justify-center rounded-2xl sm:rounded-3xl border-4 border-white/30 bg-white/10 text-4xl sm:text-5xl font-bold shadow-lg sm:shadow-xl backdrop-blur">
                  🧑‍🏫
                </div>
              )}
              {/* Indicador de status */}
              <div
                className={`absolute bottom-1 right-1 sm:bottom-2 sm:right-2 h-3 w-3 sm:h-4 sm:w-4 rounded-full border-2 border-white ${
                  estado === "falando"
                    ? "bg-green-400 animate-pulse"
                    : estado === "ouvindo"
                      ? "bg-blue-400 animate-pulse"
                      : "bg-gray-400"
                }`}
              />
            </div>

            <h1 className="text-xl sm:text-2xl font-bold">{tituloTutor}</h1>
            <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm text-indigo-100">{descricaoEstado[estado]}</p>
          </div>
        </div>
      </section>

      {/* ÁREA DE CHAT */}
      <div className="mx-auto w-full max-w-2xl flex-1 px-3 sm:px-6 py-4 sm:py-6">
        <div
          ref={chatRef}
          className="flex h-full flex-col gap-2 sm:gap-4 overflow-y-auto rounded-xl sm:rounded-2xl bg-white p-4 sm:p-6 shadow-sm ring-1 ring-slate-100"
        >
          {mensagens.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center text-center px-2">
              <div className="text-4xl sm:text-5xl mb-3 sm:mb-4">👋</div>
              <p className="text-base sm:text-lg font-bold text-slate-800">Pronto para conversar?</p>
              <p className="mt-2 sm:mt-3 max-w-xs text-xs sm:text-sm leading-relaxed text-slate-500">
                Após iniciar, a tutora fala e o microfone abre sozinho quando ela terminar.
              </p>
            </div>
          ) : (
            mensagens.map((mensagem, indice) => (
              <div
                key={indice}
                className={`flex ${mensagem.role === "user" ? "justify-end" : "justify-start"} animate-fadeIn`}
              >
                <div
                  className={`flex max-w-[85%] sm:max-w-xs gap-2 sm:gap-3 ${
                    mensagem.role === "user"
                      ? "flex-row-reverse"
                      : "flex-row"
                  }`}
                >
                  {/* Avatar mini da tutora */}
                  {mensagem.role === "assistant" && (
                    <div className="flex-shrink-0 h-6 w-6 sm:h-8 sm:w-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-[10px] sm:text-xs font-bold mt-0.5">
                      T
                    </div>
                  )}

                  {/* Bubble de mensagem */}
                  <div
                    className={`rounded-lg sm:rounded-2xl px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm leading-relaxed shadow-sm ${
                      mensagem.role === "user"
                        ? "bg-indigo-600 text-white rounded-br-none"
                        : "bg-slate-100 text-slate-800 rounded-bl-none"
                    }`}
                  >
                    <p className="break-words">{mensagem.content}</p>

                    {/* Botões de ação para mensagens da tutora */}
                    {mensagem.role === "assistant" && (
                      <div className="mt-1.5 sm:mt-2 flex gap-1.5 sm:gap-2">
                        <button
                          type="button"
                          onClick={() => falar(mensagem.content)}
                          className="flex items-center gap-0.5 rounded-full bg-white/30 hover:bg-white/50 px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-semibold transition active:scale-95"
                          title="Ouvir novamente"
                        >
                          🔊
                        </button>
                        <button
                          type="button"
                          className="flex items-center gap-0.5 rounded-full bg-white/30 hover:bg-white/50 px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-semibold transition active:scale-95"
                          title="Ver tradução"
                        >
                          📝
                        </button>
                      </div>
                    )}

                    {/* Indicador de lida para mensagens do usuário */}
                    {mensagem.role === "user" && indice === mensagens.length - 1 && (
                      <div className="mt-0.5 flex justify-end">
                        <span className="text-xs text-indigo-200">✓</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* FOOTER COM BOTÕES */}
      <div className="mx-auto w-full max-w-2xl px-3 sm:px-6 pb-4 sm:pb-6">
        {erro && (
          <div className="mb-3 sm:mb-4 rounded-lg sm:rounded-2xl bg-amber-50 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-amber-800 ring-1 ring-amber-200">
            ⚠️ {erro}
          </div>
        )}

        {estado === "pronta" || estado === "pausada" || estado === "erro" ? (
          <button
            type="button"
            onClick={iniciar}
            className="w-full rounded-lg sm:rounded-2xl bg-indigo-600 px-4 sm:px-5 py-3 sm:py-4 text-xs sm:text-sm font-bold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition"
          >
            {estado === "pronta" ? "🎤 Iniciar conversa" : "▶️ Retomar conversa"}
          </button>
        ) : (
          <button
            type="button"
            onClick={encerrar}
            className="w-full rounded-lg sm:rounded-2xl border-2 border-slate-200 bg-white px-4 sm:px-5 py-3 sm:py-4 text-xs sm:text-sm font-bold text-slate-700 hover:border-slate-300 hover:bg-slate-50 active:scale-95 transition"
          >
            ⏸️ Pausar conversa
          </button>
        )}
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
