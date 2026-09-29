import Link from "next/link";
import { Paginacao, numeroDaPagina } from "@/components/admin/Paginacao";
import { formatarData, formatarValor } from "@/lib/admin/formatar";
import { diaBrasilia } from "@/lib/admin/periodos";
import { requireArea } from "@/lib/admin/sessao";
import { CATEGORIAS, rotuloCategoria } from "@/lib/financeiro/categorias";
import { getAlertasDeCusto, getDemonstrativo, listarLancamentos } from "@/lib/financeiro/dados";
import { alertasDeOrcamento } from "@/lib/financeiro/demonstrativo";
import { competenciaDoMes } from "@/lib/financeiro/regras";
import { cancelarCusto, lancarCusto } from "./actions";

export const dynamic = "force-dynamic";

const reais = (c: number | null) => formatarValor(c === null ? null : c / 100, "reais");
const FONTE_IA: Record<string, string> = { fatura: "fatura confirmada", previsto: "valor previsto no cadastro", consumo: "estimado pelo consumo" };
const campo = "mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm";

// Custos e ferramentas: alertas, resumo do mês, ferramentas cadastradas e
// lançamentos (faturas, estimativas, impostos). Estimado × confirmado sempre
// separados; lançamento não se apaga, cancela com motivo.
export default async function CustosEFerramentas({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sessao = await requireArea("ferramentas");
  const params = await searchParams;
  const podeEscrever = sessao.funcoes.some((f) => f === "geral" || f === "financeiro");
  const mesAtual = diaBrasilia(new Date()).slice(0, 7);
  const filtroMes = params.mes ? competenciaDoMes(params.mes) : null;
  const pagina = numeroDaPagina(params.pagina);

  const { linhas: demo, cambio, fornecedores } = await getDemonstrativo(`${mesAtual}-01`, `${mesAtual}-01`);
  const [alertasSql, lanc] = await Promise.all([
    getAlertasDeCusto(cambio?.taxa ?? null),
    listarLancamentos({ competencia: filtroMes, categoria: params.categoria, natureza: params.natureza, incluirCancelados: params.cancelados === "1", pagina, porPagina: 20 }),
  ]);
  const mes = demo[0];
  const alertasOrc = mes ? alertasDeOrcamento(mes) : [];

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-violet-700">Dinheiro</p>
          <h1 className="mt-1 text-2xl font-black text-slate-950">Custos e ferramentas</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-500">
            Cadastre as ferramentas e lance as faturas. Custo de IA já entra sozinho como <strong>estimado</strong> pelo consumo; ao lançar a fatura do
            provedor, ela passa a valer como <strong>confirmado</strong> naquele mês.
          </p>
        </div>
        {podeEscrever && (
          <Link href="/admin/custos/fornecedores/novo" className="rounded-lg bg-violet-700 px-4 py-2 text-sm font-bold text-white hover:bg-violet-800">
            + Nova ferramenta
          </Link>
        )}
      </div>

      {params.ok && <p role="status" className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-900">Salvo e registrado na auditoria.</p>}
      {params.erro && <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">{params.erro}</p>}

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-black text-slate-900">Alertas</h2>
        {alertasSql.length === 0 && alertasOrc.length === 0 ? (
          <p className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500">Nenhum alerta agora.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {alertasOrc.map((a) => (
              <li key={`orc-${a.categoria}`} className={`rounded-2xl border p-4 text-sm ${a.nivel === "critico" ? "border-red-200 bg-red-50 text-red-900" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
                <strong>{a.nivel === "critico" ? "⛔ Orçamento estourado" : "⚠ Orçamento perto do limite"}: {rotuloCategoria(a.categoria)}</strong>
                <span className="block">
                  {reais(a.realizadoC)} de {reais(a.orcamentoC)} ({formatarValor(a.percentual, "percentual")}) em {formatarData(`${mesAtual}-01`).slice(3)}.
                </span>
              </li>
            ))}
            {alertasSql.map((a, i) => (
              <li key={i} className={`rounded-2xl border p-4 text-sm ${a.nivel === "critico" ? "border-red-200 bg-red-50 text-red-900" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
                <strong>{a.nivel === "critico" ? "⛔" : "⚠"} {a.titulo}</strong>
                {a.detalhe && <span className="block">{a.detalhe}</span>}
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-slate-500">Alertas são pistas para revisão; nada é bloqueado automaticamente. Franquia de ferramentas ainda não é medida.</p>
      </section>

      {mes && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-black text-slate-900">Mês atual ({formatarData(mes.mes).slice(3)})</h2>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm md:grid-cols-5">
            <div><dt className="text-xs text-slate-500">Custo total</dt><dd className="text-lg font-black">{reais(mes.custoTotalC)}</dd><dd className="text-xs text-slate-500">{mes.natureza === "sem_dados" ? "sem dados" : mes.natureza}</dd></div>
            <div><dt className="text-xs text-slate-500">IA</dt><dd className="text-lg font-black">{reais(mes.iaC)}</dd></div>
            <div><dt className="text-xs text-slate-500">Fixos (confirmado / estimado)</dt><dd className="font-bold">{reais(mes.fixosConfirmadosC)} / {reais(mes.fixosEstimadosC)}</dd></div>
            <div><dt className="text-xs text-slate-500">Variáveis (confirmado / estimado)</dt><dd className="font-bold">{reais(mes.variaveisConfirmadosC)} / {reais(mes.variaveisEstimadosC)}</dd></div>
            <div><dt className="text-xs text-slate-500">Impostos</dt><dd className="font-bold">{reais(mes.impostosC)}</dd></div>
          </dl>
          <ul className="mt-3 space-y-1 text-xs text-slate-600">
            {mes.iaDetalhe.map((d) => (
              <li key={d.provedor}>IA · {d.provedor}: {reais(d.valorC)} ({FONTE_IA[d.fonte]})</li>
            ))}
            {mes.previstos.map((p) => (
              <li key={p.fornecedor}>{p.fornecedor}: {reais(p.valorC)} (previsto no cadastro, sem fatura lançada)</li>
            ))}
            {mes.semCambio && <li className="text-amber-800">Algum valor em moeda estrangeira ficou de fora por falta de câmbio.</li>}
          </ul>
          <p className="mt-2 text-xs text-slate-500">
            {cambio ? `Câmbio PTAX ${formatarData(cambio.data)}: US$ 1 = R$ ${cambio.taxa.toFixed(4).replace(".", ",")}.` : "Câmbio indisponível."} Receitas, margens e
            comparação com o orçamento: área Financeiro.
          </p>
        </section>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-black text-slate-900">Ferramentas e fornecedores</h2>
        {fornecedores.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
            Nenhuma ferramenta cadastrada. Comece por hospedagem (Coolify/servidor), banco (Supabase), domínio, Anthropic, ElevenLabs e Asaas.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Ferramenta</th>
                  <th className="px-4 py-3">Categoria</th>
                  <th className="px-4 py-3">Cobrança</th>
                  <th className="px-4 py-3 text-right">Fixo/mês</th>
                  <th className="px-4 py-3">Vence</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {fornecedores.map((f) => (
                  <tr key={f.id}>
                    <td className="px-4 py-3 font-semibold">
                      {f.nome}
                      {f.plano_contratado ? <span className="block text-xs font-normal text-slate-500">{String(f.plano_contratado)}</span> : null}
                    </td>
                    <td className="px-4 py-3">{rotuloCategoria(f.categoria)}</td>
                    <td className="px-4 py-3">{String(f.tipo_cobranca)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{f.valor_fixo_mensal ? `${f.moeda} ${Number(f.valor_fixo_mensal).toFixed(2).replace(".", ",")}` : "—"}</td>
                    <td className="px-4 py-3">{f.dia_vencimento ? `dia ${String(f.dia_vencimento)}` : "—"}</td>
                    <td className="px-4 py-3">{f.status}</td>
                    <td className="px-4 py-3 text-right">
                      {typeof f.link_painel === "string" && f.link_painel && (
                        <a href={f.link_painel} target="_blank" rel="noopener noreferrer" className="mr-3 text-violet-700 hover:underline">painel ↗</a>
                      )}
                      <Link href={`/admin/custos/fornecedores/${f.id}`} className="font-semibold text-violet-700 hover:underline">editar</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {podeEscrever && (
        <form action={lancarCusto} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 md:grid-cols-4">
          <h2 className="font-black text-slate-900 md:col-span-4">Novo lançamento</h2>
          <label className="text-sm font-semibold md:col-span-2">
            Descrição *
            <input name="descricao" required maxLength={200} placeholder="Ex.: Fatura Anthropic setembro" className={campo} />
          </label>
          <label className="text-sm font-semibold">
            Ferramenta
            <select name="fornecedorId" className={campo}>
              <option value="">—</option>
              {fornecedores.map((f) => (
                <option key={f.id} value={f.id}>{f.nome}</option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold">
            Categoria *
            <select name="categoria" required className={campo}>
              <option value="">Escolha</option>
              {CATEGORIAS.map((c) => (
                <option key={c.id} value={c.id}>{c.grupo} · {c.rotulo}</option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold">
            Mês de referência *
            <input name="competencia" type="month" required defaultValue={mesAtual} className={campo} />
          </label>
          <label className="text-sm font-semibold">
            Valor *
            <input name="valor" inputMode="decimal" required maxLength={30} placeholder="0,00" className={campo} />
          </label>
          <label className="text-sm font-semibold">
            Moeda *
            <select name="moeda" defaultValue="BRL" className={campo}>
              <option value="BRL">Real (R$)</option>
              <option value="USD">Dólar (US$)</option>
              <option value="EUR">Euro (€)</option>
            </select>
          </label>
          <label className="text-sm font-semibold">
            Taxa de câmbio usada
            <input name="taxa" inputMode="decimal" maxLength={20} placeholder="Vazio = PTAX de hoje" className={campo} />
          </label>
          <label className="text-sm font-semibold">
            Natureza *
            <select name="natureza" required defaultValue="confirmado" className={campo}>
              <option value="confirmado">Confirmado (fatura/recibo)</option>
              <option value="estimado">Estimado</option>
            </select>
          </label>
          <label className="text-sm font-semibold">
            Tipo
            <select name="tipo" defaultValue="" className={campo}>
              <option value="">Padrão da categoria</option>
              <option value="fixo">Fixo</option>
              <option value="variavel">Variável</option>
            </select>
          </label>
          <label className="text-sm font-semibold md:col-span-2">
            Link do comprovante
            <input name="comprovante" type="url" maxLength={300} placeholder="https://…" className={campo} />
          </label>
          <div className="flex items-end">
            <button type="submit" className="w-full rounded-lg bg-violet-700 px-4 py-2 text-sm font-bold text-white hover:bg-violet-800">Lançar</button>
          </div>
        </form>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-black text-slate-900">Lançamentos</h2>
        <form method="get" className="flex flex-wrap items-end gap-3 text-sm">
          <label className="font-semibold text-slate-600">
            Mês
            <input type="month" name="mes" defaultValue={params.mes} className={campo} />
          </label>
          <label className="font-semibold text-slate-600">
            Categoria
            <select name="categoria" defaultValue={params.categoria ?? ""} className={campo}>
              <option value="">Todas</option>
              {CATEGORIAS.map((c) => (
                <option key={c.id} value={c.id}>{c.rotulo}</option>
              ))}
            </select>
          </label>
          <label className="font-semibold text-slate-600">
            Natureza
            <select name="natureza" defaultValue={params.natureza ?? ""} className={campo}>
              <option value="">Todas</option>
              <option value="confirmado">Confirmado</option>
              <option value="estimado">Estimado</option>
            </select>
          </label>
          <label className="flex items-center gap-2 pb-2 font-semibold text-slate-600">
            <input type="checkbox" name="cancelados" value="1" defaultChecked={params.cancelados === "1"} /> incluir cancelados
          </label>
          <button type="submit" className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-semibold hover:bg-slate-50">Filtrar</button>
        </form>
        {lanc.linhas.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">Nenhum lançamento com esses filtros.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {lanc.linhas.map((l) => (
              <li key={l.id} className={`rounded-2xl border border-slate-200 bg-white p-4 text-sm ${l.cancelado_em ? "opacity-60" : ""}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <strong>{l.descricao}</strong>
                    <span className="ml-2 text-xs text-slate-500">
                      {formatarData(l.competencia).slice(3)} · {rotuloCategoria(l.categoria)} · {l.tipo_custo}
                      {l.fornecedor ? ` · ${l.fornecedor}` : ""}
                    </span>
                  </div>
                  <div className="text-right tabular-nums">
                    <span className="font-black">{formatarValor(l.valor_brl, "reais")}</span>
                    <span className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ring-1 ${l.natureza === "confirmado" ? "bg-emerald-50 text-emerald-800 ring-emerald-200" : "bg-amber-50 text-amber-900 ring-amber-200"}`}>
                      {l.natureza}
                    </span>
                  </div>
                </div>
                {l.moeda !== "BRL" && (
                  <p className="mt-1 text-xs text-slate-500">
                    Original: {l.moeda} {l.valor_original.toFixed(2).replace(".", ",")} × {l.taxa_cambio.toFixed(4).replace(".", ",")} ({l.fonte_cambio}, {formatarData(l.data_cambio)})
                  </p>
                )}
                {l.comprovante && (
                  <a href={l.comprovante} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-xs text-violet-700 hover:underline">comprovante ↗</a>
                )}
                {l.cancelado_em ? (
                  <p className="mt-1 text-xs text-red-800">Cancelado em {formatarData(l.cancelado_em)}: {l.motivo_cancelamento}</p>
                ) : (
                  podeEscrever && (
                    <details className="mt-2 text-xs">
                      <summary className="cursor-pointer font-semibold text-red-700">Cancelar lançamento</summary>
                      <form action={cancelarCusto} className="mt-2 flex flex-wrap gap-2">
                        <input type="hidden" name="id" value={l.id} />
                        <input name="motivo" required minLength={5} maxLength={500} placeholder="Motivo (fica no histórico)" className="min-w-[240px] flex-1 rounded-lg border border-slate-300 px-3 py-1.5" />
                        <button type="submit" className="rounded-lg border border-red-300 px-3 py-1.5 font-semibold text-red-700 hover:bg-red-50">Cancelar</button>
                      </form>
                    </details>
                  )
                )}
              </li>
            ))}
          </ul>
        )}
        <Paginacao pagina={pagina} porPagina={20} total={lanc.total} base="/admin/custos" params={params} />
      </section>
    </div>
  );
}
