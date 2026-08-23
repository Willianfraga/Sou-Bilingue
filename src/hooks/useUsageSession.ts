"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  startSessionAction,
  endSessionAction,
  getActiveSessionAction,
  getElapsedTimeAction,
  heartbeatSessionAction,
} from "@/app/aluno/sessions/actions";

interface UseUsageSessionProps {
  autoStart?: boolean;
  maxIdleSeconds?: number;
  onTimeWarning?: (remaining: number) => void; // 15 min restantes
  onTimeAlertCritical?: (remaining: number) => void; // < 5 min
  onSessionEnded?: (horasConsumidas: number) => void;
}

export function useUsageSession(options: UseUsageSessionProps = {}) {
  const {
    autoStart = true,
    maxIdleSeconds = 3600, // 1 hora
    onTimeWarning,
    onTimeAlertCritical,
    onSessionEnded,
  } = options;

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0); // em segundos
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const warningShownRef = useRef(false);
  const criticalAlertShownRef = useRef(false);

  // ========================================================================
  // Iniciar sessão
  // ========================================================================

  const startSession = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await startSessionAction();

      if (!result.success) {
        setError(result.error || "Erro ao iniciar sessão");
        setLoading(false);
        return { success: false, error: result.error };
      }

      setSessionId(result.sessionId || "");
      setIsActive(true);
      setElapsedTime(0);
      warningShownRef.current = false;
      criticalAlertShownRef.current = false;

      setLoading(false);
      return { success: true, sessionId: result.sessionId };
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Erro desconhecido";
      setError(errorMsg);
      setLoading(false);
      return { success: false, error: errorMsg };
    }
  }, []);

  // ========================================================================
  // Encerrar sessão
  // ========================================================================

  const endSession = useCallback(async () => {
    if (!sessionId) {
      setError("Nenhuma sessão ativa");
      return { success: false, error: "Nenhuma sessão ativa" };
    }

    setLoading(true);
    setError(null);

    try {
      const result = await endSessionAction(sessionId);

      if (!result.success) {
        setError(result.error || "Erro ao encerrar sessão");
        setLoading(false);
        return { success: false, error: result.error };
      }

      setSessionId(null);
      setIsActive(false);
      onSessionEnded?.(result.horasConsumidas || 0);

      setLoading(false);
      return { success: true, horasConsumidas: result.horasConsumidas };
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Erro desconhecido";
      setError(errorMsg);
      setLoading(false);
      return { success: false, error: errorMsg };
    }
  }, [sessionId, onSessionEnded]);

  // ========================================================================
  // Timer para atualizar tempo decorrido
  // ========================================================================

  useEffect(() => {
    if (!isActive || !sessionId) {
      return;
    }

    // Limpar timer anterior
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    // Atualizar a cada segundo
    timerRef.current = setInterval(async () => {
      setElapsedTime((prev) => prev + 1);

      // Sincronizar e registrar atividade no servidor a cada 10s.
      if (elapsedTime % 10 === 0) {
        await heartbeatSessionAction(sessionId);
        const timeResult = await getElapsedTimeAction(sessionId);
        if (timeResult.success && timeResult.segundos) {
          setElapsedTime(timeResult.segundos);
        }
      }

      // Alertas de consumo
      const hoursRemaining = Math.ceil(
        (maxIdleSeconds - (elapsedTime + 1)) / 3600
      );

      // Alerta com 15 minutos restantes
      if (
        hoursRemaining === 0 &&
        (elapsedTime + 1) % 60 === 45 &&
        !warningShownRef.current
      ) {
        warningShownRef.current = true;
        onTimeWarning?.(15 * 60);
      }

      // Alerta crítico com < 5 minutos
      if (
        hoursRemaining === 0 &&
        (elapsedTime + 1) > maxIdleSeconds - 300 &&
        !criticalAlertShownRef.current
      ) {
        criticalAlertShownRef.current = true;
        onTimeAlertCritical?.(maxIdleSeconds - (elapsedTime + 1));
      }

      // Auto-encerrar por timeout
      if (elapsedTime + 1 > maxIdleSeconds) {
        await endSession();
      }
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isActive, sessionId, elapsedTime, maxIdleSeconds, onTimeWarning, onTimeAlertCritical, endSession]);

  // ========================================================================
  // Auto-start na montagem
  // ========================================================================

  useEffect(() => {
    if (autoStart && !sessionId) {
      // Verificar se já existe sessão ativa
      getActiveSessionAction().then((result) => {
        if (result.success && result.session) {
          setSessionId(result.session.id);
          setIsActive(true);
          // Calcular tempo decorrido
          const iniciada = new Date(result.session.iniciada_em).getTime();
          const agora = new Date().getTime();
          const segundos = Math.floor((agora - iniciada) / 1000);
          setElapsedTime(segundos);
        } else if (result.success) {
          void startSession();
        }
      });
    }
  }, [autoStart, sessionId, startSession]);

  // ========================================================================
  // Formatar tempo
  // ========================================================================

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m ${secs}s`;
  };

  return {
    sessionId,
    isActive,
    elapsedTime,
    elapsedTimeFormatted: formatTime(elapsedTime),
    loading,
    error,
    startSession,
    endSession,
  };
}
