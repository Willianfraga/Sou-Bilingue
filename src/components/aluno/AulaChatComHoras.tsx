"use client";

import { AulaChat } from "./AulaChat";
import { HourUsageTracker } from "./HourUsageTracker";

interface AulaChatComHorasProps {
  tituloTutor: string;
  idiomaDaVoz: string;
  fotoTutor?: string;
  temaInicial?: string;
  alunoId: string;
  horasRestantes: number;
  horasTotal: number;
}

/**
 * Wrapper que combina AulaChat com rastreamento de horas
 * Layout: HourUsageTracker à esquerda, chat à direita (desktop)
 * Layout: Tracker acima, chat abaixo (mobile)
 */
export function AulaChatComHoras({
  tituloTutor,
  idiomaDaVoz,
  fotoTutor,
  temaInicial,
  alunoId,
  horasRestantes,
  horasTotal,
}: AulaChatComHorasProps) {
  return (
    <div className="flex flex-col lg:flex-row gap-4 p-4">
      {/* Tracker de Horas — Sidebar no desktop, top no mobile */}
      <aside className="lg:w-80 flex-shrink-0">
        <div className="sticky top-4">
          <HourUsageTracker
            alunoId={alunoId}
            horasRestantes={horasRestantes}
            horasTotal={horasTotal}
            maxIdleSeconds={3600} // 1 hora
          />
        </div>
      </aside>

      {/* Chat Principal */}
      <main className="flex-1 min-w-0">
        <AulaChat
          tituloTutor={tituloTutor}
          idiomaDaVoz={idiomaDaVoz}
          fotoTutor={fotoTutor}
          temaInicial={temaInicial}
        />
      </main>
    </div>
  );
}
