"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useUsageSession } from "@/hooks/useUsageSession";
import { relogio } from "@/lib/aluno/inicio";
import { HourWarningAlert } from "./HourWarningAlert";

interface HourUsageTrackerProps {
  alunoId: string;
  horasRestantes: number;
  horasTotal: number;
  maxIdleSeconds?: number;
  // true = conversa em andamento; o relógio para quando a conversa pausa.
  contando?: boolean;
}

// Na tela da aula, só o relógio da sessão. O saldo de horas fica em
// "Minhas horas" (menu bento). A contagem de uso (useUsageSession: início
// automático, sinal periódico, encerramento por inatividade) não mudou.
export function HourUsageTracker({ alunoId: _alunoId, horasRestantes, maxIdleSeconds = 3600, contando = false }: HourUsageTrackerProps) {
  // Tempo de conversa desta aula: só avança enquanto a conversa está ativa.
  const [segundosDeAula, setSegundosDeAula] = useState(0);
  useEffect(() => {
    if (!contando) return;
    const id = window.setInterval(() => setSegundosDeAula((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [contando]);
  const [alertLevel, setAlertLevel] = useState<"warning" | "critical" | "exhausted" | null>(null);
  const [showAlert, setShowAlert] = useState(false);
  const [remainingMinutes, setRemainingMinutes] = useState(0);

  const { loading, error, startSession } = useUsageSession({
    autoStart: true,
    maxIdleSeconds,
    onTimeWarning: (remaining) => {
      setAlertLevel("warning");
      setRemainingMinutes(Math.floor(remaining / 60));
      setShowAlert(true);
    },
    onTimeAlertCritical: (remaining) => {
      setAlertLevel("critical");
      setRemainingMinutes(Math.floor(remaining / 60));
      setShowAlert(true);
    },
  });

  useEffect(() => {
    if (horasRestantes <= 0) {
      setAlertLevel("exhausted");
      setShowAlert(true);
    }
  }, [horasRestantes]);

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

      {error && (
        <p className="text-right text-xs text-red-700">
          Não foi possível contar o tempo desta aula.{" "}
          <button type="button" onClick={() => startSession()} disabled={loading} className="font-bold underline">
            Tentar de novo
          </button>
        </p>
      )}

      {horasRestantes <= 0 && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-right text-sm text-red-800">
          Suas horas deste ciclo acabaram. <Link href="/aluno/horas" className="font-bold underline">Ver minhas horas</Link>
        </p>
      )}

      <HourWarningAlert
        isVisible={showAlert}
        level={alertLevel || "warning"}
        remainingMinutes={remainingMinutes}
        onDismiss={() => setShowAlert(false)}
        onRecharge={() => {
          window.location.href = "/aluno/horas";
        }}
      />
    </div>
  );
}
