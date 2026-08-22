"use client";

import { useEffect, useState } from "react";

interface HourWarningAlertProps {
  isVisible: boolean;
  level: "warning" | "critical" | "exhausted";
  remainingMinutes?: number;
  remainingHours?: number;
  onDismiss: () => void;
  onRecharge?: () => void;
}

export function HourWarningAlert({
  isVisible,
  level,
  remainingMinutes = 0,
  remainingHours = 0,
  onDismiss,
  onRecharge,
}: HourWarningAlertProps) {
  const [show, setShow] = useState(isVisible);

  useEffect(() => {
    setShow(isVisible);
  }, [isVisible]);

  if (!show) return null;

  const styles = {
    warning: {
      bg: "bg-yellow-50",
      border: "border-yellow-200",
      text: "text-yellow-900",
      icon: "⚠️",
      title: "Atenção: Horas acabando",
      desc:
        remainingMinutes < 60
          ? `Você tem ${remainingMinutes} minutos restantes neste mês`
          : `Você tem ${remainingHours}h restantes neste mês`,
    },
    critical: {
      bg: "bg-red-50",
      border: "border-red-200",
      text: "text-red-900",
      icon: "🚨",
      title: "Urgente: Última sessão",
      desc: `Você tem menos de ${remainingMinutes} minutos de saldo. Termine esta sessão e recarregue para continuar.`,
    },
    exhausted: {
      bg: "bg-red-100",
      border: "border-red-400",
      text: "text-red-800",
      icon: "❌",
      title: "Sem horas disponíveis",
      desc: "Seu saldo de horas acabou. Recarregue seu plano para continuar conversando.",
    },
  };

  const config = styles[level];

  return (
    <div
      className={`fixed top-4 right-4 max-w-sm ${config.bg} border ${config.border} ${config.text} rounded-lg p-4 shadow-lg z-50 animate-pulse`}
      role="alert"
    >
      <div className="flex gap-3">
        {/* Icon */}
        <div className="text-xl flex-shrink-0">{config.icon}</div>

        {/* Content */}
        <div className="flex-1">
          <h3 className="font-semibold text-sm">{config.title}</h3>
          <p className="text-xs mt-1 opacity-90">{config.desc}</p>

          {/* Actions */}
          <div className="flex gap-2 mt-3">
            <button
              onClick={onDismiss}
              className={`px-3 py-1 text-xs font-medium rounded opacity-75 hover:opacity-100 transition`}
            >
              Descartar
            </button>
            {onRecharge && level !== "exhausted" && (
              <button
                onClick={onRecharge}
                className={`px-3 py-1 text-xs font-medium rounded ${config.bg} font-semibold`}
              >
                Recarregar
              </button>
            )}
          </div>
        </div>

        {/* Close */}
        <button
          onClick={onDismiss}
          className="flex-shrink-0 text-lg opacity-50 hover:opacity-100 transition"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
