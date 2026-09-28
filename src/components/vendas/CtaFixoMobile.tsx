"use client";

import { useEffect, useState } from "react";
import { anexarCampanha } from "@/lib/vendas/rastreio";
import { campanhaSalva } from "./Rastreador";

// CTA fixo discreto no celular: aparece depois do topo, some perto dos
// planos (que já têm os próprios botões) e pode ser fechado.
export function CtaFixoMobile({ texto, href }: { texto: string; href: string }) {
  const [visivel, setVisivel] = useState(false);
  const [fechado, setFechado] = useState(false);

  useEffect(() => {
    const aoRolar = () => {
      const planos = document.getElementById("planos")?.getBoundingClientRect();
      const pertoDosPlanos = planos ? planos.top < window.innerHeight && planos.bottom > 0 : false;
      setVisivel(window.scrollY > window.innerHeight * 0.8 && !pertoDosPlanos);
    };
    aoRolar();
    window.addEventListener("scroll", aoRolar, { passive: true });
    return () => window.removeEventListener("scroll", aoRolar);
  }, []);

  if (fechado || !visivel) return null;
  return (
    <div className="fixed inset-x-3 bottom-3 z-40 flex items-center gap-2 rounded-2xl bg-slate-950/90 p-2 shadow-2xl ring-1 ring-white/10 backdrop-blur md:hidden">
      <a href={anexarCampanha(href, campanhaSalva())} data-evento="cta_principal" className="vendas-cta min-h-[52px] flex-1 py-3 text-base">
        {texto}
      </a>
      <button
        type="button"
        onClick={() => setFechado(true)}
        aria-label="Fechar"
        className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-300 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
      >
        ✕
      </button>
    </div>
  );
}
