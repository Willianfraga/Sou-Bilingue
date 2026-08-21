"use client";

import { useRef, useState } from "react";

type Mensagem = { role: "user" | "assistant"; content: string };
type Estado = "pronta" | "falando" | "ouvindo" | "pensando" | "pausada" | "erro";

// O navegador pede acesso ao microfone apenas na primeira aula. Depois de
// iniciada, a conversa segue sozinha: tutor fala, aluno responde, tutor fala.
export function AulaChat({ tituloTutor, idiomaDaVoz }: { tituloTutor: string; idiomaDaVoz: string }) {
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [estado, setEstado] = useState<Estado>("pronta");
  const [erro, setErro] = useState("");
  const mensagensRef = useRef<Mensagem[]>([]);
  const recognitionRef = useRef<any>(null);
  const ativaRef = useRef(false);

  function atualizarMensagens(proximas: Mensagem[]) {
    mensagensRef.current = proximas;
    setMensagens(proximas);
  }

  function pararReconhecimento() {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
  }

  function encerrar() {
    ativaRef.current = false;
    pararReconhecimento();
    window.speechSynthesis?.cancel();
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

  function falar(texto: string) {
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

  async function responder(texto: string) {
    if (!ativaRef.current) return;
    const proximas = [...mensagensRef.current, { role: "user" as const, content: texto }];
    atualizarMensagens(proximas);
    setEstado("pensando");

    try {
      const resposta = await fetch("/api/aula/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mensagens: proximas }),
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
      falar(respostaCompleta);
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
      await responder("Ola! Vamos iniciar uma conversa de pratica.");
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
    <div className="mx-auto flex min-h-[calc(100vh-10rem)] max-w-2xl flex-col gap-5">
      <section className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#20345f] to-[#536ec8] text-white shadow-xl shadow-indigo-100">
        <div className="flex items-center justify-between px-5 pt-5">
          <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">Conversa continua</span>
          <button type="button" onClick={encerrar} className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold hover:bg-white/25">Encerrar</button>
        </div>
        <div className="flex min-h-48 flex-col items-center justify-center px-6 pb-8 pt-5 text-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-[2rem] border border-white/20 bg-white/15 text-4xl font-semibold shadow-lg">SB</div>
          <h1 className="mt-4 text-xl font-bold">{tituloTutor}</h1>
          <p className="mt-1 text-sm text-indigo-100">{descricaoEstado[estado]}</p>
        </div>
      </section>

      <section className="flex-1 space-y-3 rounded-[1.75rem] bg-white p-4 shadow-sm ring-1 ring-slate-100">
        {mensagens.length === 0 ? (
          <div className="flex min-h-44 flex-col items-center justify-center text-center">
            <p className="text-base font-bold text-slate-800">Pronto para conversar?</p>
            <p className="mt-2 max-w-xs text-sm leading-6 text-slate-500">Apos iniciar, a tutora fala e o microfone abre sozinho quando ela terminar.</p>
          </div>
        ) : mensagens.map((mensagem, indice) => (
          <div key={indice} className={"max-w-[86%] rounded-2xl px-4 py-3 text-sm leading-6 " + (mensagem.role === "user" ? "ml-auto bg-indigo-600 text-white" : "bg-slate-100 text-slate-800")}>
            <p>{mensagem.content}</p>
            {mensagem.role === "assistant" && mensagem.content && (
              <button type="button" onClick={() => falar(mensagem.content)} className="mt-3 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-indigo-700 shadow-sm ring-1 ring-indigo-100">
                Ouvir novamente
              </button>
            )}
          </div>
        ))}
      </section>

      {erro && <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">{erro}</p>}

      {estado === "pronta" || estado === "pausada" || estado === "erro" ? (
        <button type="button" onClick={iniciar} className="w-full rounded-2xl bg-indigo-600 px-5 py-4 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700">
          {estado === "pronta" ? "Iniciar conversa" : "Retomar conversa"}
        </button>
      ) : (
        <button type="button" onClick={encerrar} className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-bold text-slate-700">Pausar conversa</button>
      )}
    </div>
  );
}
