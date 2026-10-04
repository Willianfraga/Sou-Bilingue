"use client";

import { AulaChat } from "./AulaChat";
import { HourUsageTracker } from "./HourUsageTracker";
import { TavusAula } from "./TavusAula";
import { useState } from "react";

interface AulaChatComHorasProps {
  tituloTutor: string;
  idiomaDaVoz: string;
  fotoTutor?: string;
  temaInicial?: string;
  alunoId: string;
  horasRestantes: number;
  horasTotal: number;
  tavusDisponivel?: boolean;
  vozPremium?: boolean;
}

/**
 * Wrapper que combina AulaChat com a contagem de uso das horas.
 * Layout: relógio da sessão no topo e o chat ocupando a largura toda.
 */
export function AulaChatComHoras({
  tituloTutor,
  idiomaDaVoz,
  fotoTutor,
  temaInicial,
  alunoId,
  horasRestantes,
  horasTotal,
  tavusDisponivel = false,
  vozPremium = true,
}: AulaChatComHorasProps) {
  const [modo, setModo] = useState<"video" | "leve">(tavusDisponivel ? "video" : "leve");
  return (
    <div className="flex flex-col gap-3">
      {/* Relógio da sessão no topo; saldo de horas fica em "Minhas horas" */}
      <HourUsageTracker
        alunoId={alunoId}
        horasRestantes={horasRestantes}
        horasTotal={horasTotal}
        maxIdleSeconds={3600} // 1 hora
      />

      {/* Chat Principal */}
      <main className="min-w-0">
        {tavusDisponivel && (
          <div className="mb-3 flex rounded-2xl bg-white p-1.5 shadow-sm ring-1 ring-slate-200">
            <button type="button" onClick={() => setModo("video")} className={`flex-1 rounded-xl px-4 py-3 text-sm font-bold transition ${modo === "video" ? "bg-indigo-600 text-white shadow" : "text-slate-600"}`}>Videochamada realista</button>
            <button type="button" onClick={() => setModo("leve")} className={`flex-1 rounded-xl px-4 py-3 text-sm font-bold transition ${modo === "leve" ? "bg-indigo-600 text-white shadow" : "text-slate-600"}`}>Modo leve</button>
          </div>
        )}
        {modo === "video" && tavusDisponivel ? (
          <TavusAula tituloTutor={tituloTutor} />
        ) : (
          <AulaChat tituloTutor={tituloTutor} idiomaDaVoz={idiomaDaVoz} fotoTutor={fotoTutor} temaInicial={temaInicial} vozPremium={vozPremium} />
        )}
      </main>
    </div>
  );
}
