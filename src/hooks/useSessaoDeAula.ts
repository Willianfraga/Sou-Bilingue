"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { encerrarSessaoAction, iniciarSessaoAction, sinalSessaoAction } from "@/app/aluno/sessions/actions";
import { MAXIMO_POR_SINAL, SINAL_A_CADA_MS } from "@/lib/billing/horas";

// Pausa mais longa que isto encerra a sessão (e cobra o que foi usado).
// Pausas curtas (erro de rede, retomar logo) continuam na mesma sessão.
const ENCERRAR_APOS_PAUSA_MS = 60_000;

export type ErroDaSessao = "sem_horas" | "sem_assinatura" | "falha" | null;

// Contagem de horas da aula (Fase 3 — docs/fase3-horas.md). Só conta o
// tempo com a conversa ativa (`contando`), por segundo; o banco arredonda
// por minuto ao encerrar. A sessão começa quando a conversa começa, manda o
// tempo ativo a cada 30 s e fecha na pausa longa, ao sair da página ou
// quando o saldo acaba.
export function useSessaoDeAula(contando: boolean) {
  const [erro, setErro] = useState<ErroDaSessao>(null);
  const [esgotou, setEsgotou] = useState(false);
  const [horasRestantes, setHorasRestantes] = useState<number | null>(null);

  const sessaoRef = useRef<string | null>(null);
  const iniciandoRef = useRef(false);
  const pendentesRef = useRef(0); // segundos ativos ainda não enviados
  const bloqueadoRef = useRef(false); // sem horas/assinatura: não insiste

  const encerrar = useCallback(async () => {
    const id = sessaoRef.current;
    if (!id) return;
    sessaoRef.current = null;
    const pendentes = pendentesRef.current;
    pendentesRef.current = 0;
    await encerrarSessaoAction(id, pendentes).catch(() => undefined);
  }, []);

  const iniciar = useCallback(async () => {
    if (sessaoRef.current || iniciandoRef.current || bloqueadoRef.current) return;
    iniciandoRef.current = true;
    try {
      const r = await iniciarSessaoAction();
      if (r.ok) {
        sessaoRef.current = r.sessaoId;
        setHorasRestantes(r.horasRestantes);
        setErro(null);
      } else {
        if (r.erro !== "falha") bloqueadoRef.current = true;
        if (r.erro === "sem_horas") setEsgotou(true);
        setErro(r.erro);
      }
    } catch {
      setErro("falha");
    } finally {
      iniciandoRef.current = false;
    }
  }, []);

  const tentarDeNovo = useCallback(() => {
    bloqueadoRef.current = false;
    setErro(null);
    void iniciar();
  }, [iniciar]);

  // Conversa ativa: abre a sessão (se preciso) e soma 1 s por segundo.
  useEffect(() => {
    if (!contando) return;
    void iniciar();
    const id = window.setInterval(() => {
      pendentesRef.current += 1;
    }, 1000);
    return () => window.clearInterval(id);
  }, [contando, iniciar]);

  // Pausa longa encerra a sessão.
  useEffect(() => {
    if (contando) return;
    const id = window.setTimeout(() => void encerrar(), ENCERRAR_APOS_PAUSA_MS);
    return () => window.clearTimeout(id);
  }, [contando, encerrar]);

  // Sinal a cada 30 s com o tempo ativo (mantém a sessão viva na pausa curta).
  useEffect(() => {
    const id = window.setInterval(async () => {
      const sessaoId = sessaoRef.current;
      if (!sessaoId) return;
      const enviar = Math.min(pendentesRef.current, MAXIMO_POR_SINAL);
      const r = await sinalSessaoAction(sessaoId, enviar).catch(() => null);
      if (!r || sessaoRef.current !== sessaoId) return;
      if (r.ok) {
        pendentesRef.current = Math.max(0, pendentesRef.current - enviar);
        setHorasRestantes(r.horasRestantes);
        if (r.esgotou) {
          setEsgotou(true);
          bloqueadoRef.current = true;
          await encerrar();
        }
      } else if (r.erro === "sessao_encerrada") {
        // Fechada pelo servidor (sem sinal por 2 min): a próxima fala abre outra.
        sessaoRef.current = null;
        pendentesRef.current = 0;
      }
    }, SINAL_A_CADA_MS);
    return () => window.clearInterval(id);
  }, [encerrar]);

  // Saída da página: sendBeacon chega mesmo com a aba fechando.
  useEffect(() => {
    const aoSair = () => {
      const sessaoId = sessaoRef.current;
      if (!sessaoId) return;
      sessaoRef.current = null;
      const corpo = JSON.stringify({ sessaoId, segundos: pendentesRef.current });
      pendentesRef.current = 0;
      navigator.sendBeacon?.("/api/aula/sessao", new Blob([corpo], { type: "application/json" }));
    };
    window.addEventListener("pagehide", aoSair);
    return () => {
      window.removeEventListener("pagehide", aoSair);
      // Saiu da aula pelo menu (navegação dentro do app).
      void encerrar();
    };
  }, [encerrar]);

  return { erro, esgotou, horasRestantes, tentarDeNovo };
}
