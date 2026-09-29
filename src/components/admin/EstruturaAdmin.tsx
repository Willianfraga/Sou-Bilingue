"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { SairButton } from "@/components/SairButton";
import { AREAS_ADMIN, areaDoCaminho, type AreaAdmin } from "@/lib/admin/permissoes";

// Estrutura do painel: menu lateral agrupado e recolhível (desktop), gaveta
// (celular) e cabeçalho com trilha de navegação. Recebe do servidor só as
// áreas que a função do admin permite — a checagem real é requireArea.

const CHAVE_RECOLHIDO = "sb:admin:menu-recolhido";
const INICIAIS = (rotulo: string) => rotulo.split(/\s+/).slice(0, 2).map((p) => p[0]).join("").toUpperCase();

export function EstruturaAdmin({
  areasPermitidas,
  nome,
  funcoes,
  children,
}: {
  areasPermitidas: string[];
  nome: string;
  funcoes: string;
  children: React.ReactNode;
}) {
  const caminho = usePathname() ?? "/admin";
  const [recolhido, setRecolhido] = useState(false);
  const [gaveta, setGaveta] = useState(false);

  useEffect(() => {
    try {
      setRecolhido(localStorage.getItem(CHAVE_RECOLHIDO) === "1");
    } catch {
      // sem armazenamento: menu aberto
    }
  }, []);
  useEffect(() => setGaveta(false), [caminho]);

  const alternar = () => {
    setRecolhido((r) => {
      try {
        localStorage.setItem(CHAVE_RECOLHIDO, r ? "0" : "1");
      } catch {
        // ignora
      }
      return !r;
    });
  };

  const areas = AREAS_ADMIN.filter((a) => areasPermitidas.includes(a.id));
  const grupos = [...new Set(areas.map((a) => a.grupo))];
  const atual = areaDoCaminho(caminho);
  const subpagina = atual && caminho !== atual.href ? caminho.slice(atual.href.length + 1).split("/")[0] : null;

  const menu = (compacto: boolean) => (
    <nav aria-label="Painel administrativo" className="flex flex-1 flex-col gap-5 overflow-y-auto">
      {grupos.map((g) => (
        <div key={g}>
          {!compacto && <p className="mb-1 px-3 text-[11px] font-bold uppercase tracking-widest text-violet-200/80">{g}</p>}
          <ul className="flex flex-col gap-0.5">
            {areas
              .filter((a) => a.grupo === g)
              .map((a) => (
                <ItemMenu key={a.id} area={a} ativo={atual?.id === a.id} compacto={compacto} />
              ))}
          </ul>
        </div>
      ))}
    </nav>
  );

  const rodape = (compacto: boolean) => (
    <div className="border-t border-white/15 pt-3">
      {!compacto && (
        <>
          <p className="px-3 text-sm font-extrabold text-white">{nome}</p>
          <p className="px-3 text-xs text-violet-200">{funcoes}</p>
        </>
      )}
      <SairButton inverted />
    </div>
  );

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-800">
      {/* Desktop */}
      <aside
        className={`sticky top-0 hidden h-screen shrink-0 flex-col gap-4 bg-gradient-to-b from-indigo-950 via-indigo-900 to-violet-900 px-3 py-5 text-white transition-[width] md:flex ${
          recolhido ? "w-[72px]" : "w-64"
        }`}
      >
        <div className="flex items-center justify-between gap-2 px-1">
          {!recolhido && <span className="text-sm font-black uppercase tracking-[0.14em]">Sou Bilíngue · Admin</span>}
          <button
            type="button"
            onClick={alternar}
            aria-label={recolhido ? "Abrir menu" : "Recolher menu"}
            aria-expanded={!recolhido}
            className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          >
            {recolhido ? "»" : "«"}
          </button>
        </div>
        {menu(recolhido)}
        {rodape(recolhido)}
      </aside>

      {/* Celular: gaveta */}
      {gaveta && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Menu do painel">
          <button type="button" aria-label="Fechar menu" className="absolute inset-0 bg-slate-950/50" onClick={() => setGaveta(false)} />
          <aside className="relative flex h-full w-72 max-w-[85%] flex-col gap-4 bg-gradient-to-b from-indigo-950 via-indigo-900 to-violet-900 px-3 py-5 text-white shadow-2xl">
            <div className="flex items-center justify-between px-1">
              <span className="text-sm font-black uppercase tracking-[0.14em]">Sou Bilíngue · Admin</span>
              <button type="button" onClick={() => setGaveta(false)} aria-label="Fechar menu" className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-white/10">
                ✕
              </button>
            </div>
            {menu(false)}
            {rodape(false)}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur sm:px-6">
          <button
            type="button"
            onClick={() => setGaveta(true)}
            aria-label="Abrir menu"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 md:hidden"
          >
            ☰
          </button>
          <nav aria-label="Você está em" className="min-w-0 flex-1 text-sm">
            <ol className="flex flex-wrap items-center gap-1 text-slate-500">
              <li>
                <Link href="/admin" className="hover:text-violet-700">Painel</Link>
              </li>
              {atual && atual.href !== "/admin" && (
                <li className="flex items-center gap-1">
                  <span aria-hidden>›</span>
                  {subpagina ? <Link href={atual.href} className="hover:text-violet-700">{atual.rotulo}</Link> : <span className="font-semibold text-slate-900">{atual.rotulo}</span>}
                </li>
              )}
              {subpagina && (
                <li className="flex items-center gap-1">
                  <span aria-hidden>›</span>
                  <span className="font-semibold text-slate-900">Detalhe</span>
                </li>
              )}
              {atual?.href === "/admin" && (
                <li className="flex items-center gap-1">
                  <span aria-hidden>›</span>
                  <span className="font-semibold text-slate-900">Visão geral</span>
                </li>
              )}
            </ol>
          </nav>
          <span className="hidden text-sm font-semibold text-slate-600 sm:inline">{nome}</span>
        </header>
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

function ItemMenu({ area, ativo, compacto }: { area: AreaAdmin; ativo: boolean; compacto: boolean }) {
  const base = `flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition ${compacto ? "justify-center" : ""}`;
  const conteudo = (
    <>
      {compacto ? (
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-[11px] font-black">{INICIAIS(area.rotulo)}</span>
      ) : (
        <span className="flex-1">{area.rotulo}</span>
      )}
      {!compacto && !area.pronta && <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-violet-200">em breve</span>}
    </>
  );
  if (!area.pronta) {
    return (
      <li>
        <span className={`${base} cursor-not-allowed text-violet-200/60`} title={`${area.rotulo} — em construção`} aria-disabled="true">
          {conteudo}
        </span>
      </li>
    );
  }
  return (
    <li>
      <Link
        href={area.href}
        title={compacto ? area.rotulo : undefined}
        aria-current={ativo ? "page" : undefined}
        className={`${base} ${ativo ? "bg-white text-indigo-950 shadow" : "text-white hover:bg-white/10"} focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60`}
      >
        {conteudo}
      </Link>
    </li>
  );
}
