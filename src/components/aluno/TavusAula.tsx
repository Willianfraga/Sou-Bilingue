"use client";

import { useState } from "react";

type SessaoTavus = {
  conversationId: string;
  conversationUrl: string;
};

export function TavusAula({ tituloTutor }: { tituloTutor: string }) {
  const [sessao, setSessao] = useState<SessaoTavus | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  async function iniciarVideochamada() {
    setCarregando(true);
    setErro("");
    try {
      const resposta = await fetch("/api/aula/tavus", { method: "POST" });
      const dados = (await resposta.json()) as SessaoTavus & { erro?: string };
      if (!resposta.ok) throw new Error(dados.erro || "Não foi possível iniciar o avatar.");
      setSessao(dados);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível iniciar o avatar.");
    } finally {
      setCarregando(false);
    }
  }

  if (!sessao) {
    return (
      <section className="flex min-h-[620px] flex-col items-center justify-center rounded-[2rem] bg-gradient-to-br from-[#312e81] via-[#5b3df5] to-[#7c3aed] p-6 text-center text-white shadow-xl">
        <span className="rounded-full bg-white/15 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em]">Avatar realista · Beta</span>
        <h2 className="mt-5 text-3xl font-black">Videochamada com {tituloTutor}</h2>
        <p className="mt-3 max-w-md text-sm leading-6 text-indigo-100">Conversa ao vivo com sincronização labial, expressões faciais e movimentos naturais.</p>
        {erro && <p className="mt-5 rounded-2xl bg-red-950/35 px-4 py-3 text-sm text-red-100">{erro}</p>}
        <button type="button" onClick={iniciarVideochamada} disabled={carregando} className="mt-7 rounded-2xl bg-white px-7 py-4 font-black text-indigo-700 shadow-lg transition hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-70">
          {carregando ? "Preparando a professora..." : "Iniciar videochamada →"}
        </button>
        <p className="mt-4 text-xs text-indigo-200">O navegador solicitará acesso ao microfone.</p>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-[2rem] bg-slate-950 shadow-2xl">
      <div className="flex items-center justify-between bg-slate-900 px-4 py-3 text-white">
        <div><p className="text-xs font-bold text-emerald-300">● AO VIVO</p><p className="text-sm font-semibold">{tituloTutor}</p></div>
        <button type="button" onClick={() => setSessao(null)} className="rounded-xl bg-white/10 px-4 py-2 text-sm font-bold hover:bg-white/20">Encerrar</button>
      </div>
      <iframe
        src={sessao.conversationUrl}
        title={`Videochamada com ${tituloTutor}`}
        allow="camera; microphone; autoplay; fullscreen; display-capture"
        className="aspect-video min-h-[520px] w-full border-0 bg-slate-950"
      />
    </section>
  );
}
