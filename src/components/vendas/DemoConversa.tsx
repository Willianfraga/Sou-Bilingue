"use client";

import { useEffect, useRef, useState } from "react";

// Demonstração ilustrativa de uma aula (não é conversa real de aluno).
// Digita mensagem a mensagem quando entra na tela; com movimento reduzido,
// mostra tudo de uma vez.
type Fala = { quem: "tutor" | "aluno"; texto: string };

const ROTEIRO: Fala[] = [
  { quem: "tutor", texto: "Oi, Ju! Vi que você adora viajar. Vamos simular sua chegada num hotel em Londres?" },
  { quem: "aluno", texto: "Vamos! I want a room for two night." },
  { quem: "tutor", texto: "Entendi perfeitamente! Só um ajuste: \"two nights\", no plural. Quer tentar de novo?" },
  { quem: "aluno", texto: "I want a room for two nights, please." },
  { quem: "tutor", texto: "Perfeito — e o \"please\" deixou tudo mais natural. Agora pergunte o horário do café da manhã." },
];

export function DemoConversa({ nomeTutor, fotoTutor }: { nomeTutor: string; fotoTutor: string }) {
  const [visiveis, setVisiveis] = useState(0);
  const [digitado, setDigitado] = useState("");
  const [iniciar, setIniciar] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisiveis(ROTEIRO.length);
      return;
    }
    const el = caixa.current;
    if (!el) return;
    const obs = new IntersectionObserver((en) => {
      if (en.some((e) => e.isIntersecting)) {
        setIniciar(true);
        obs.disconnect();
      }
    }, { threshold: 0.4 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!iniciar || visiveis >= ROTEIRO.length) return;
    const alvo = ROTEIRO[visiveis].texto;
    if (digitado.length < alvo.length) {
      const t = setTimeout(() => setDigitado(alvo.slice(0, digitado.length + 2)), 28);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      setVisiveis((v) => v + 1);
      setDigitado("");
    }, 900);
    return () => clearTimeout(t);
  }, [iniciar, visiveis, digitado]);

  const mensagens = ROTEIRO.slice(0, visiveis);
  const atual = visiveis < ROTEIRO.length && iniciar ? { ...ROTEIRO[visiveis], texto: digitado } : null;

  return (
    <div ref={caixa} className="relative rounded-[2rem] bg-slate-950 p-4 shadow-2xl ring-1 ring-white/10 sm:p-5">
      <div className="mb-4 flex items-center gap-3 border-b border-white/10 pb-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={fotoTutor} alt="" width={44} height={44} loading="lazy" className="h-11 w-11 rounded-full bg-indigo-900 object-cover object-[50%_25%] ring-2 ring-fuchsia-400/60" />
        <div>
          <p className="text-sm font-bold text-white">{nomeTutor} · Inglês</p>
          <p className="text-xs text-emerald-300">● aula por voz</p>
        </div>
        <span className="ml-auto rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-300">
          Demonstração ilustrativa
        </span>
      </div>
      <ol className="space-y-3" aria-label="Exemplo de conversa em aula" aria-live="polite">
        {[...mensagens, ...(atual ? [atual] : [])].map((m, i) => (
          <li key={i} className={`flex ${m.quem === "aluno" ? "justify-end" : "justify-start"}`}>
            <p
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                m.quem === "aluno"
                  ? "rounded-br-sm bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white"
                  : "rounded-bl-sm bg-white/10 text-slate-100"
              } ${atual && i === mensagens.length ? "cursor-digitando" : ""}`}
            >
              <span className="sr-only">{m.quem === "aluno" ? "Aluno: " : `${nomeTutor}: `}</span>
              {m.texto}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}
