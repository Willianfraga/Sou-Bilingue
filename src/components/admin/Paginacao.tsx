import Link from "next/link";

// Paginação no servidor: preserva os filtros atuais na URL.
export function Paginacao({ pagina, porPagina, total, base, params }: { pagina: number; porPagina: number; total: number; base: string; params: Record<string, string | undefined> }) {
  const paginas = Math.max(1, Math.ceil(total / porPagina));
  const link = (p: number) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v && k !== "pagina") q.set(k, v);
    if (p > 1) q.set("pagina", String(p));
    const s = q.toString();
    return s ? `${base}?${s}` : base;
  };
  const botao = "rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-semibold hover:bg-slate-50";
  return (
    <nav aria-label="Páginas" className="flex items-center justify-between gap-3 text-sm text-slate-600">
      <span>
        {total} registro{total === 1 ? "" : "s"} · página {pagina} de {paginas}
      </span>
      <span className="flex gap-2">
        {pagina > 1 ? <Link href={link(pagina - 1)} className={botao}>← Anterior</Link> : <span className={`${botao} opacity-40`}>← Anterior</span>}
        {pagina < paginas ? <Link href={link(pagina + 1)} className={botao}>Próxima →</Link> : <span className={`${botao} opacity-40`}>Próxima →</span>}
      </span>
    </nav>
  );
}

export function numeroDaPagina(v: string | undefined): number {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 && n < 100_000 ? n : 1;
}
