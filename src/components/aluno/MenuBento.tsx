"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ITENS_DO_MENU } from "@/lib/aluno/inicio";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

// Menu bento da área do aluno: um botão em forma de grade (▦) que abre os
// atalhos em quadradinhos. Fecha com Esc, clique fora ou ao navegar.
export function MenuBento({ nome, claro = false }: { nome: string; claro?: boolean }) {
  const [aberto, setAberto] = useState(false);
  const caminho = usePathname();
  const router = useRouter();
  const botaoRef = useRef<HTMLButtonElement>(null);
  const painelRef = useRef<HTMLDivElement>(null);

  useEffect(() => setAberto(false), [caminho]);

  useEffect(() => {
    if (!aberto) return;
    painelRef.current?.querySelector<HTMLElement>("a, button")?.focus();
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setAberto(false);
        botaoRef.current?.focus();
      }
    };
    const aoClicar = (e: MouseEvent) => {
      if (!painelRef.current?.contains(e.target as Node) && !botaoRef.current?.contains(e.target as Node)) setAberto(false);
    };
    window.addEventListener("keydown", aoTeclar);
    window.addEventListener("mousedown", aoClicar);
    return () => {
      window.removeEventListener("keydown", aoTeclar);
      window.removeEventListener("mousedown", aoClicar);
    };
  }, [aberto]);

  async function sair() {
    await createSupabaseBrowserClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="relative">
      <button
        ref={botaoRef}
        type="button"
        onClick={() => setAberto((a) => !a)}
        aria-label="Abrir menu"
        aria-expanded={aberto}
        aria-haspopup="true"
        className={`flex h-12 w-12 items-center justify-center rounded-2xl transition focus:outline-none focus-visible:ring-4 ${
          claro ? "bg-white/15 text-white ring-1 ring-white/30 hover:bg-white/25 focus-visible:ring-white/50" : "bg-gradient-to-br from-[#2c3e60] via-[#536ec8] to-[#6f85d9] text-white shadow-lg shadow-[#536ec8]/30 hover:brightness-110 focus-visible:ring-[#6f85d9]/50"
        }`}
      >
        {/* Ícone bento: 3 × 3 quadradinhos */}
        <span aria-hidden className="grid grid-cols-3 gap-[3px]">
          {Array.from({ length: 9 }, (_, i) => (
            <span key={i} className="h-[6px] w-[6px] rounded-[2px] bg-current" />
          ))}
        </span>
      </button>

      {aberto && (
        <div
          ref={painelRef}
          role="dialog"
          aria-label="Menu"
          className="absolute right-0 top-14 z-50 w-[min(92vw,380px)] rounded-3xl bg-white p-4 text-slate-800 shadow-2xl ring-1 ring-slate-200"
        >
          <p className="px-1 pb-3 text-sm font-bold text-slate-500">Olá, {nome}</p>
          <ul className="grid grid-cols-3 gap-2">
            {ITENS_DO_MENU.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  title={item.descricao}
                  className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-2xl bg-slate-50 p-2 text-center ring-1 ring-slate-100 transition hover:bg-[#eef1ff] hover:ring-[#b9c4f0] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#536ec8]"
                >
                  <span aria-hidden className="text-2xl">{item.icone}</span>
                  <span className="text-xs font-bold leading-tight text-slate-800">{item.rotulo}</span>
                </Link>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={sair}
            className="mt-3 w-full rounded-2xl px-3 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#536ec8]"
          >
            Sair
          </button>
        </div>
      )}
    </div>
  );
}
