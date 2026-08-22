"use client";

import { useState, useEffect } from "react";
import { useUsageSession } from "@/hooks/useUsageSession";
import { HourWarningAlert } from "./HourWarningAlert";

interface HourUsageTrackerProps {
  alunoId: string;
  horasRestantes: number;
  horasTotal: number;
  maxIdleSeconds?: number;
}

export function HourUsageTracker({
  alunoId,
  horasRestantes,
  horasTotal,
  maxIdleSeconds = 3600,
}: HourUsageTrackerProps) {
  const [alertLevel, setAlertLevel] = useState<"warning" | "critical" | "exhausted" | null>(null);
  const [showAlert, setShowAlert] = useState(false);
  const [remainingMinutes, setRemainingMinutes] = useState(0);

  const {
    sessionId,
    isActive,
    elapsedTime,
    elapsedTimeFormatted,
    loading,
    error,
    startSession,
    endSession,
  } = useUsageSession({
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
    onSessionEnded: (horasConsumidas) => {
      console.log(`Sessão encerrada. Horas consumidas: ${horasConsumidas}`);
    },
  });

  const percentualUsado = Math.round((elapsedTime / (horasTotal * 3600)) * 100);
  const percentualRestante = 100 - percentualUsado;

  useEffect(() => {
    if (horasRestantes <= 0) {
      setAlertLevel("exhausted");
      setShowAlert(true);
    }
  }, [horasRestantes]);

  return (
    <div className="space-y-4">
      {/* Status Card */}
      <div className="bg-white border border-neutral-200 rounded-lg p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-neutral-900">Horas de Conversação</h3>
            <p className="text-sm text-neutral-600">
              {horasRestantes} de {horasTotal} horas disponíveis
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600">{horasRestantes}h</div>
            <div className="text-xs text-neutral-500">Restantes</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-neutral-600">
            <span>Uso este mês</span>
            <span>{percentualUsado}%</span>
          </div>
          <div className="w-full bg-neutral-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                percentualUsado > 90
                  ? "bg-red-500"
                  : percentualUsado > 75
                  ? "bg-yellow-500"
                  : "bg-green-500"
              }`}
              style={{ width: `${percentualUsado}%` }}
            />
          </div>
        </div>
      </div>

      {/* Session Status */}
      {isActive && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-blue-900">Sessão Ativa</h4>
              <p className="text-sm text-blue-700">
                Tempo decorrido: {elapsedTimeFormatted}
              </p>
            </div>
            <button
              onClick={() => endSession()}
              disabled={loading}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 transition text-sm font-medium"
            >
              {loading ? "Encerrando..." : "Encerrar"}
            </button>
          </div>
        </div>
      )}

      {/* Start Session Button */}
      {!isActive && horasRestantes > 0 && (
        <button
          onClick={() => startSession()}
          disabled={loading}
          className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 transition font-medium"
        >
          {loading ? "Iniciando..." : "Começar Conversação"}
        </button>
      )}

      {/* No Hours Available */}
      {horasRestantes <= 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-900 font-semibold">Sem horas disponíveis</p>
          <p className="text-sm text-red-700 mt-1">
            Recarregue seu plano para continuar conversando.
          </p>
          <button className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-medium">
            Recarregar Horas
          </button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Alerts */}
      <HourWarningAlert
        isVisible={showAlert}
        level={alertLevel || "warning"}
        remainingMinutes={remainingMinutes}
        onDismiss={() => setShowAlert(false)}
        onRecharge={() => {
          // TODO: Abrir modal de recarga
          console.log("Recarregar horas");
        }}
      />
    </div>
  );
}
