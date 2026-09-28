"use client";

import { useEffect } from "react";
import { anexarCampanha, extrairCampanha, type Campanha } from "@/lib/vendas/rastreio";

// Métricas anônimas do funil + preservação dos parâmetros de campanha.
// - Sessão: id aleatório no sessionStorage (some ao fechar a aba). Sem
//   cookies de terceiros, sem dados pessoais.
// - Cliques: qualquer elemento com data-evento="..." (e data-plano) registra.
// - Links com data-campanha recebem utm_*, src e sck da URL.
// - Plano escolhido fica no sessionStorage para o checkout pré-selecionar.

const CHAVE_SESSAO = "sb:sessao";
const CHAVE_CAMPANHA = "sb:campanha";
export const CHAVE_PLANO = "sb:plano";

function lerStorage(chave: string): string | null {
  try {
    return window.sessionStorage.getItem(chave);
  } catch {
    return null;
  }
}
function gravarStorage(chave: string, valor: string) {
  try {
    window.sessionStorage.setItem(chave, valor);
  } catch {
    // modo privado / bloqueado: segue sem persistir
  }
}

export function campanhaSalva(): Campanha {
  try {
    return JSON.parse(lerStorage(CHAVE_CAMPANHA) ?? "{}") as Campanha;
  } catch {
    return {};
  }
}

export function enviarEvento(nome: string, extra: { plano?: string } = {}) {
  let sessao = lerStorage(CHAVE_SESSAO);
  if (!sessao) {
    sessao = crypto.randomUUID();
    gravarStorage(CHAVE_SESSAO, sessao);
  }
  const corpo = JSON.stringify({ nome, sessao, pagina: window.location.pathname, plano: extra.plano, campanha: campanhaSalva() });
  try {
    if (navigator.sendBeacon?.("/api/eventos", new Blob([corpo], { type: "application/json" }))) return;
  } catch {
    // cai para o fetch
  }
  fetch("/api/eventos", { method: "POST", headers: { "Content-Type": "application/json" }, body: corpo, keepalive: true }).catch(() => {});
}

export function Rastreador() {
  useEffect(() => {
    // Campanha: a da URL tem prioridade sobre a guardada.
    const daUrl = extrairCampanha(new URLSearchParams(window.location.search));
    const campanha = { ...campanhaSalva(), ...daUrl };
    gravarStorage(CHAVE_CAMPANHA, JSON.stringify(campanha));

    document.querySelectorAll<HTMLAnchorElement>("a[data-campanha]").forEach((link) => {
      link.href = anexarCampanha(link.getAttribute("href") ?? "/", campanha);
    });

    enviarEvento("pagina_vista");

    const aoClicar = (e: MouseEvent) => {
      const alvo = (e.target as HTMLElement).closest<HTMLElement>("[data-evento]");
      if (!alvo) return;
      const plano = alvo.dataset.plano;
      if (plano) gravarStorage(CHAVE_PLANO, plano);
      enviarEvento(alvo.dataset.evento!, { plano });
    };
    document.addEventListener("click", aoClicar);

    let planosVistos = false;
    const secaoPlanos = document.getElementById("planos");
    const observador = secaoPlanos
      ? new IntersectionObserver((entradas) => {
          if (!planosVistos && entradas.some((en) => en.isIntersecting)) {
            planosVistos = true;
            enviarEvento("planos_vistos");
            observador?.disconnect();
          }
        }, { threshold: 0.3 })
      : null;
    if (secaoPlanos) observador?.observe(secaoPlanos);

    return () => {
      document.removeEventListener("click", aoClicar);
      observador?.disconnect();
    };
  }, []);

  return null;
}
