import { formatarData, formatarValor } from "@/lib/admin/formatar";
import { diaBrasilia, resolverPeriodo } from "@/lib/admin/periodos";
import { requireArea } from "@/lib/admin/sessao";
import { nomeDeExibicao } from "@/lib/billing/planos";
import { CATEGORIAS, rotuloCategoria } from "@/lib/financeiro/categorias";
import { getDemonstrativo, getMargens } from "@/lib/financeiro/dados";
import { pontoDeEquilibrio, type LinhaMes } from "@/lib/financeiro/demonstrativo";
import { NOME_DO_IDIOMA } from "@/lib/types";
import { gravarOrcamento } from "../custos/actions";

export const dynamic = "force-dynamic";

const reais = (c: number | null) => formatarValor(c === null ? null : c / 100, "reais");
const mesCurto = (iso: string) => formatarData(iso).slice(3);

function somarMeses(mes: string, n: number) {
  const [a, m] = mes.split("-").map(Number);
  const d = new Date(Date.UTC(a, m - 1 + n, 1));
  return d.toISOString().slice(0, 7);
}

const BADGE: Record<string, string> = {
  confirmado: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  estimado: "bg-amber-50 text-amber-900 ring-amber-200",
  parcial: "bg-orange-50 text-orange-900 ring-orange-200",
  sem_dados: "bg-slate-100 text-slate-500 ring-slate-200",
};

type Linha = { rotulo: string; valor: (l: LinhaMes) => string; destaque?: boolean; ajuda?: string };

// Financeiro: demonstrativo mensal (receitas × custos, estimado × confirmado),
// orçamento × realizado, ponto de equilíbrio e margens por plano/idioma.
export default async function Financeiro({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sessao = await requireArea("financeiro");
  const params = await searchParams;
  const podeEscrever = sessao.funcoes.some((f) => f === "geral" || f === "financeiro");
  const mesAtual = diaBrasilia(new Date()).slice(0, 7);
  const qtd = [3, 6, 12].includes(Number(params.meses)) ? Number(params.meses) : 6;
  const mesOrc = params.mes && /^\d{4}-\d{2}$/.test(params.mes) ? params.mes : mesAtual;
  const inicio = somarMeses(mesAtual, -(qtd - 1));
  const ultimoMes = mesOrc > mesAtual ? mesOrc : mesAtual;

  const periodo90 = resolverPeriodo({ periodo: "90d" });
  const [{ linhas: todas, cambio }, margens] = await Promise.all([
    getDemonstrativo(`${inicio < mesOrc ? inicio : mesOrc}-01`, `${ultimoMes}-01`),
    getMargens(periodo90.atual.de, periodo90.atual.ate),
  ]);
  const linhas = todas.filter((l) => l.mes >= `${inicio}-01` && l.mes <= `${mesAtual}-01`);
  const doOrcamento = todas.find((l) => l.mes === `${mesOrc}-01`);
  const anterior = linhas.length >= 2 ? linhas[linhas.length - 2] : null;
  const atual = linhas[linhas.length - 1];

  const DRE: Linha[] = [
    { rotulo: "Mensalidades", valor: (l) => reais(l.receitaAssinaturasC) },
    { rotulo: "Horas extras", valor: (l) => reais(l.receitaHorasExtrasC) },
    { rotulo: "Receita bruta", valor: (l) => reais(l.receitaBrutaC), destaque: true },
    { rotulo: "(−) Reembolsos", valor: (l) => reais(l.reembolsosC) },
    { rotulo: "(−) Taxas do gateway", valor: (l) => `${reais(l.taxasGatewayC)}${l.gatewayParcial ? " *" : ""}`, ajuda: "* há pagamento sem valor líquido informado pelo Asaas (parcial)" },
    { rotulo: "Receita líquida", valor: (l) => reais(l.receitaLiquidaC), destaque: true },
    { rotulo: "(−) Inteligência artificial", valor: (l) => reais(l.iaC) },
    { rotulo: "(−) Fixos confirmados", valor: (l) => reais(l.fixosConfirmadosC) },
    { rotulo: "(−) Fixos estimados/previstos", valor: (l) => reais(l.fixosEstimadosC) },
    { rotulo: "(−) Variáveis confirmados", valor: (l) => reais(l.variaveisConfirmadosC) },
    { rotulo: "(−) Variáveis estimados", valor: (l) => reais(l.variaveisEstimadosC) },
    { rotulo: "(−) Impostos", valor: (l) => reais(l.impostosC) },
    { rotulo: "Custo total", valor: (l) => reais(l.custoTotalC), destaque: true },
    { rotulo: "Resultado operacional", valor: (l) => reais(l.resultadoC), destaque: true },
    { rotulo: "Margem", valor: (l) => formatarValor(l.margem, "percentual") },
    { rotulo: "Alunos ativos", valor: (l) => String(l.ativos) },
    { rotulo: "Alunos pagantes", valor: (l) => String(l.pagantes) },
    { rotulo: "Custo por aluno ativo", valor: (l) => reais(l.custoPorAtivoC) },
    { rotulo: "Custo por aluno pagante", valor: (l) => reais(l.custoPorPaganteC) },
  ];

  const categoriasOrc = doOrcamento
    ? ["total", ...CATEGORIAS.map((c) => c.id).filter((id) => doOrcamento.orcamento[id] !== undefined || (doOrcamento.realizadoPorCategoria[id] ?? 0) > 0)]
    : ["total"];
  const pe = (l: LinhaMes | null | undefined) => (l ? { l, r: pontoDeEquilibrio(l) } : null);
  const pontos = [pe(anterior), pe(atual)].filter(Boolean) as Array<{ l: LinhaMes; r: ReturnType<typeof pontoDeEquilibrio> }>;
  const custoBrl = (usd: unknown) => (cambio ? Math.round(Number(usd) * cambio.taxa * 100) : null);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-violet-700">Dinheiro</p>
          <h1 className="mt-1 text-2xl font-black text-slate-950">Financeiro</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-500">
            Receitas confirmadas pelo Asaas; custos separados em <strong>confirmados</strong> (faturas lançadas) e <strong>estimados</strong> (consumo
            de IA, valores previstos no cadastro, estimativas lançadas). Cada mês mostra a natureza do resultado.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <form method="get" className="flex items-end gap-2">
            <label className="text-xs font-semibold text-slate-600">
              Meses
              <select name="meses" defaultValue={String(qtd)} className="mt-1 block rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm">
                <option value="3">3</option>
                <option value="6">6</option>
                <option value="12">12</option>
              </select>
            </label>
            <button type="submit" className="rounded-lg bg-violet-700 px-4 py-2 text-sm font-bold text-white hover:bg-violet-800">Ver</button>
          </form>
          <a href={`/admin/financeiro/exportar?meses=${qtd}`} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50">
            Exportar CSV
          </a>
        </div>
      </div>
      {params.ok && <p role="status" className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-900">Orçamento salvo e registrado na auditoria.</p>}
      {params.erro && <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">{params.erro}</p>}

      <section className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full min-w-[720px] text-sm">
          <caption className="px-4 pt-4 text-left font-black text-slate-900">Demonstrativo mensal</caption>
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3" />
              {linhas.map((l) => (
                <th key={l.mes} className="px-4 py-3 text-right">
                  {mesCurto(l.mes)}
                  <span className={`ml-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold ring-1 ${BADGE[l.natureza]}`}>{l.natureza === "sem_dados" ? "sem dados" : l.natureza}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 tabular-nums">
            {DRE.map((r) => (
              <tr key={r.rotulo} className={r.destaque ? "bg-slate-50 font-black" : ""}>
                <th scope="row" className="px-4 py-2 text-left font-semibold text-slate-700" title={r.ajuda}>{r.rotulo}</th>
                {linhas.map((l) => (
                  <td key={l.mes} className="px-4 py-2 text-right">{r.valor(l)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="px-4 pb-4 text-xs text-slate-500">
          {cambio ? `Custos em dólar convertidos pela PTAX de ${formatarData(cambio.data)} (R$ ${cambio.taxa.toFixed(4).replace(".", ",")}); faturas lançadas usam a taxa registrada em cada uma.` : "Câmbio indisponível: custos em dólar ficam de fora."}{" "}
          Taxas do gateway vêm do valor líquido informado pelo Asaas.
        </p>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h2 className="font-black text-slate-900">Orçamento × realizado</h2>
            <form method="get" className="flex items-end gap-2">
              <input type="hidden" name="meses" value={qtd} />
              <input type="month" name="mes" defaultValue={mesOrc} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
              <button type="submit" className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold">Ver mês</button>
            </form>
          </div>
          <form action={gravarOrcamento} className="mt-3">
            <input type="hidden" name="competencia" value={mesOrc} />
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="py-2">Categoria</th>
                  <th className="py-2 text-right">Realizado</th>
                  <th className="py-2 text-right">Orçamento (R$)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 tabular-nums">
                {categoriasOrc.map((cat) => {
                  const realizado = doOrcamento?.realizadoPorCategoria[cat] ?? 0;
                  const orc = doOrcamento?.orcamento[cat];
                  const pct = orc ? (realizado / orc) * 100 : null;
                  return (
                    <tr key={cat}>
                      <td className="py-2 font-semibold">{rotuloCategoria(cat)}</td>
                      <td className={`py-2 text-right ${pct !== null && pct >= 100 ? "text-red-700" : pct !== null && pct >= 80 ? "text-amber-800" : ""}`}>
                        {reais(realizado)}
                        {pct !== null && <span className="block text-xs">{formatarValor(pct, "percentual")}</span>}
                      </td>
                      <td className="py-2 text-right">
                        {podeEscrever ? (
                          <input
                            name={`orc_${cat}`}
                            inputMode="decimal"
                            defaultValue={orc !== undefined ? (orc / 100).toFixed(2).replace(".", ",") : ""}
                            aria-label={`Orçamento de ${rotuloCategoria(cat)}`}
                            className="w-28 rounded-lg border border-slate-300 px-2 py-1 text-right"
                          />
                        ) : (
                          reais(orc ?? null)
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {podeEscrever && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button type="submit" className="rounded-lg bg-violet-700 px-4 py-2 text-sm font-bold text-white hover:bg-violet-800">Salvar orçamento</button>
                <span className="text-xs text-slate-500">Campo vazio remove o orçamento da categoria. Alertas: 80% e 100%.</span>
              </div>
            )}
          </form>
          {podeEscrever && (
            <details className="mt-3 text-sm">
              <summary className="cursor-pointer font-semibold text-violet-700">Orçar outra categoria</summary>
              <form action={gravarOrcamento} className="mt-2 flex flex-wrap items-end gap-2">
                <input type="hidden" name="competencia" value={mesOrc} />
                <OrcarCategoria />
              </form>
            </details>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-black text-slate-900">Ponto de equilíbrio (estimado)</h2>
          <p className="text-xs text-slate-500">Quantos alunos pagantes cobrem os custos fixos, com a margem por aluno do mês (receita líquida − custos variáveis, por pagante).</p>
          <ul className="mt-3 space-y-3 text-sm">
            {pontos.map(({ l, r }) => (
              <li key={l.mes} className="rounded-lg bg-slate-50 p-3">
                <strong>{mesCurto(l.mes)}</strong>
                {r.pagantesNecessarios !== null ? (
                  <span className="block">
                    <span className="text-lg font-black">{r.pagantesNecessarios}</span> pagante(s) necessários · hoje: {l.pagantes} · fixos {reais(r.fixosC)} · margem por aluno {reais(r.contribuicaoC)}
                  </span>
                ) : (
                  <span className="block text-slate-600">{r.motivo} (fixos: {reais(r.fixosC)})</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="font-black text-slate-900">Margem por plano e por idioma — últimos 90 dias</h2>
        <p className="text-xs text-slate-500">Receita confirmada × custo de IA estimado dos alunos. Custos fixos não são rateados. Margem por tutor: sem receita por tutor (o aluno paga o plano, não o tutor).</p>
        <div className="mt-3 grid gap-4 lg:grid-cols-2">
          {([["Plano", margens.por_plano, (k: string) => (k === "sem_plano" ? "Sem plano" : nomeDeExibicao(k))], ["Idioma", margens.por_idioma, (k: string) => NOME_DO_IDIOMA[k as keyof typeof NOME_DO_IDIOMA] ?? k]] as const).map(([titulo, itens, nome]) => (
            <table key={titulo} className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="py-2">{titulo}</th>
                  <th className="py-2 text-right">Pagantes</th>
                  <th className="py-2 text-right">Receita</th>
                  <th className="py-2 text-right">Custo IA</th>
                  <th className="py-2 text-right">Margem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 tabular-nums">
                {itens.length === 0 && (
                  <tr><td colSpan={5} className="py-3 text-slate-500">Sem receita ou consumo no período.</td></tr>
                )}
                {itens.map((i) => {
                  const recC = Math.round(Number(i.receita) * 100);
                  const custoC = custoBrl(i.custo_usd);
                  return (
                    <tr key={String(i.chave)}>
                      <td className="py-2 font-semibold">{nome(String(i.chave))}</td>
                      <td className="py-2 text-right">{String(i.pagantes)}</td>
                      <td className="py-2 text-right">{reais(recC)}</td>
                      <td className="py-2 text-right">{reais(custoC)}</td>
                      <td className="py-2 text-right">{custoC === null ? "—" : reais(recC - custoC)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Assistente da página de vendas (sem aluno): {reais(custoBrl(margens.assistente_vendas_usd))} no período.
        </p>
      </section>
    </div>
  );
}

function OrcarCategoria() {
  return (
    <>
      <label className="text-xs font-semibold text-slate-600">
        Categoria
        <select name="categoria_nova" className="mt-1 block rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm" required>
          {CATEGORIAS.map((c) => (
            <option key={c.id} value={c.id}>{c.rotulo}</option>
          ))}
        </select>
      </label>
      <label className="text-xs font-semibold text-slate-600">
        Valor (R$)
        <input name="valor_novo" inputMode="decimal" required className="mt-1 block w-28 rounded-lg border border-slate-300 px-2 py-1.5 text-right text-sm" />
      </label>
      <button type="submit" className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold">Adicionar</button>
    </>
  );
}
