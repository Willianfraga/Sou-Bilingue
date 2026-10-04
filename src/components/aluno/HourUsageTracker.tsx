"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSessaoDeAula } from "@/hooks/useSessaoDeAula";
import { relogio } from "@/lib/aluno/inicio";
import { formatarHoras } from "@/lib/billing/horas";

interface HourUsageTrackerProps {
  horasRestantes: number;
  // true = conversa em andamento; o relógio e a contagem param na pausa.
  contando?: boolean;
}

// Avisa quando faltar pouco (em horas: 15 min).
const POUCO_SALDO = 0.25;

// Na tela da aula, só o relógio da sessão. O saldo e o extrato ficam em
// "Minhas horas" (menu bento). A contagem de horas (useSessaoDeAula) usa o
// mesmo critério do relógio: só conversa ativa.
export function HourUsageTracker({ horasRestantes, contando = false }: HourUsageTrackerProps) {
  const [segundosDeAula, setSegundosDeAula] = useState(0);
  useEffect(() => {
    if (!contando) return;
    const id = window.setInterval(() => setSegundosDeAula((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [contando]);

  const sessao = useSessaoDeAula(contando);
  // Saldo ao vivo: o do último sinal (já desconta o tempo desta sessão).
  const saldo = sessao.horasRestantes ?? horasRestantes;
  const semHoras = sessao.esgotou || horasRestantes <= 0;

  return (
    <div className="flex flex-col items-end gap-2">
      <div
        role="timer"
        aria-label={`Tempo desta aula: ${relogio(segundosDeAula)}${contando ? "" : " (pausado)"}`}
        className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 shadow-md ring-1 ring-[#dfe4fa]"
      >
        <span aria-hidden className="text-lg">⏱️</span>
        <span className="text-xs font-semibold text-slate-500">{contando || segundosDeAula === 0 ? "Tempo de aula" : "Pausado"}</span>
        <span className="font-mono text-lg font-black tabular-nums text-[#3a4f9e]">{relogio(segundosDeAula)}</span>
        <span aria-hidden className={`h-2 w-2 rounded-full ${contando ? "animate-pulse bg-emerald-500" : "bg-slate-300"}`} />
      </div>

      {semHoras ? (
        <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-right text-sm text-red-800">
          Suas horas acabaram. <Link href="/aluno/horas" className="font-bold underline">Comprar horas extras</Link>
        </p>
      ) : saldo > 0 && saldo <= POUCO_SALDO ? (
        <p role="status" className="rounded-xl bg-amber-50 px-3 py-2 text-right text-sm text-amber-900">
          Restam {formatarHoras(saldo)} de conversa. <Link href="/aluno/horas" className="font-bold underline">Minhas horas</Link>
        </p>
      ) : null}

      {sessao.erro === "falha" && (
        <p className="text-right text-xs text-red-700">
          Não foi possível contar o tempo desta aula.{" "}
          <button type="button" onClick={sessao.tentarDeNovo} className="font-bold underline">
            Tentar de novo
          </button>
        </p>
      )}
    </div>
  );
}
