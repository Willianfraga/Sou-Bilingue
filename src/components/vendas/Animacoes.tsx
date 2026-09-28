"use client";

import { useEffect } from "react";

// Entrada progressiva das seções ([data-revelar]) e parallax suave dos
// elementos decorativos ([data-parallax="0.1"]). Nada acontece se o sistema
// pedir movimento reduzido; sem JS, o CSS mantém tudo visível.
export function Animacoes() {
  useEffect(() => {
    const reduzir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const raiz = document.documentElement;
    if (reduzir || !("IntersectionObserver" in window)) return;

    raiz.classList.add("animar");
    const observador = new IntersectionObserver(
      (entradas) => {
        for (const en of entradas) {
          if (en.isIntersecting) {
            en.target.classList.add("visivel");
            observador.unobserve(en.target);
          }
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.1 },
    );
    document.querySelectorAll("[data-revelar]").forEach((el) => observador.observe(el));

    const decorativos = Array.from(document.querySelectorAll<HTMLElement>("[data-parallax]"));
    let quadro = 0;
    const aoRolar = () => {
      cancelAnimationFrame(quadro);
      quadro = requestAnimationFrame(() => {
        const y = window.scrollY;
        if (y > window.innerHeight * 1.5) return; // só no topo da página
        for (const el of decorativos) {
          el.style.translate = `0 ${(-y * Number(el.dataset.parallax || 0.1)).toFixed(1)}px`;
        }
      });
    };
    window.addEventListener("scroll", aoRolar, { passive: true });

    return () => {
      observador.disconnect();
      window.removeEventListener("scroll", aoRolar);
      cancelAnimationFrame(quadro);
      raiz.classList.remove("animar");
    };
  }, []);

  return null;
}
