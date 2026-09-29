import type { Indicador } from "@/lib/admin/indicadores";
import { ROTULO_NATUREZA, formatarValor, formatarVariacao, tomDaVariacao } from "@/lib/admin/formatar";

const COR_NATUREZA = {
  confirmado: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  estimado: "bg-amber-50 text-amber-900 ring-amber-200",
  parcial: "bg-orange-50 text-orange-900 ring-orange-200",
  calculado: "bg-slate-100 text-slate-700 ring-slate-200",
} as const;

const COR_TOM = { bom: "text-emerald-700", ruim: "text-red-700", neutro: "text-slate-500" } as const;

// Cartão de indicador: valor, natureza do dado (confirmado/estimado/…),
// comparação com o período anterior e explicação da métrica.
export function CartaoIndicador({ i }: { i: Indicador }) {
  const tom = tomDaVariacao(i.variacao, i.menorEhMelhor);
  const direcao = i.variacao === null ? "" : i.variacao > 0 ? "▲" : i.variacao < 0 ? "▼" : "";
  return (
    <article className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-600">{i.rotulo}</h3>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ${COR_NATUREZA[i.natureza]}`}>
          {ROTULO_NATUREZA[i.natureza]}
        </span>
      </div>
      <p className="mt-2 text-2xl font-black tabular-nums text-slate-950">{formatarValor(i.valor, i.formato)}</p>
      {i.anterior !== null || i.variacao !== null ? (
        <p className={`mt-1 text-xs font-semibold ${COR_TOM[tom]}`}>
          {direcao && <span aria-hidden>{direcao} </span>}
          {formatarVariacao(i.variacao)}
        </p>
      ) : (
        <p className="mt-1 text-xs text-slate-400">Situação atual</p>
      )}
      <details className="mt-2 text-xs text-slate-500">
        <summary className="cursor-pointer select-none font-semibold text-violet-700">O que é?</summary>
        <p className="mt-1">{i.ajuda}</p>
        {i.anterior !== null && <p className="mt-1">Período anterior: {formatarValor(i.anterior, i.formato)}</p>}
      </details>
    </article>
  );
}

export function SecaoIndicadores({ titulo, descricao, itens }: { titulo: string; descricao?: string; itens: Indicador[] }) {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-lg font-black text-slate-900">{titulo}</h2>
        {descricao && <p className="text-sm text-slate-500">{descricao}</p>}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {itens.map((i) => (
          <CartaoIndicador key={i.id} i={i} />
        ))}
      </div>
    </section>
  );
}
