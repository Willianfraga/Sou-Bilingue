"use client";

import { useState } from "react";
import type { VideoIncorporado } from "@/lib/vendas/conteudo";

// Vídeo de uma aula real. Carrega o player só no clique: a página continua
// leve e o YouTube/Vimeo não recebe nada de quem não quis assistir.
export function VideoAula({ video, titulo }: { video: VideoIncorporado; titulo: string }) {
  const [tocando, setTocando] = useState(false);

  return (
    <div className="relative aspect-video overflow-hidden rounded-[2rem] bg-slate-950 shadow-2xl ring-1 ring-white/10">
      {tocando ? (
        <iframe
          src={video.embed}
          title={titulo}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          className="absolute inset-0 h-full w-full"
        />
      ) : (
        <button
          type="button"
          onClick={() => setTocando(true)}
          className="group absolute inset-0 flex items-center justify-center focus:outline-none focus-visible:ring-4 focus-visible:ring-fuchsia-300"
          aria-label={`Assistir: ${titulo}`}
        >
          {video.capa && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={video.capa} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-70 transition group-hover:opacity-90" />
          )}
          <span className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-3xl text-white shadow-2xl transition group-hover:scale-110">
            ▶
          </span>
          <span className="absolute bottom-4 left-4 rounded-full bg-slate-950/80 px-3 py-1 text-xs font-bold text-white">
            Aula real · clique para assistir
          </span>
        </button>
      )}
    </div>
  );
}
