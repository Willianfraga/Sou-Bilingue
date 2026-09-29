import { formatarValor } from "@/lib/admin/formatar";
import { DESCONTO_PRIMEIRA_MENSALIDADE, PLANOS_DE_TESTE, horasPorSemana, nomeDeExibicao } from "@/lib/billing/planos";
import { churnMensal, ltvEstimadoC } from "@/lib/financeiro/regras";

type J = Record<string, unknown>;
const n = (v: unknown) => Number(v ?? 0) || 0;
const reais = (v: number | null) => formatarValor(v, "reais");

function Cartao({ rotulo, valor, nota, natureza }: { rotulo: string; valor: string; nota?: string; natureza?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold text-slate-500">{rotulo}</p>
      <p className="mt-1 text-xl font-black tabular-nums text-slate-950">{valor}</p>
      {(nota || natureza) && <p className="mt-1 text-xs text-slate-500">{[natureza, nota].filter(Boolean).join(" · ")}</p>}
    </div>
  );
}

function Contagem({ titulo, itens, vazio }: { titulo: string; itens: J; vazio: string }) {
  const lista = Object.entries(itens).sort((a, b) => n(b[1]) - n(a[1]));
  return (
    <div>
      <h3 className="text-sm font-bold text-slate-700">{titulo}</h3>
      {lista.length === 0 ? (
        <p className="text-sm text-slate-500">{vazio}</p>
      ) : (
        <ul className="mt-1 space-y-1 text-sm">
          {lista.map(([k, v]) => (
            <li key={k} className="flex justify-between gap-3 border-b border-slate-100 py-1">
              <span>{k}</span>
              <span className="font-bold tabular-nums">{String(v)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Resumo de assinaturas e receitas (public.admin_assinaturas_resumo).
export function ResumoAssinaturas({ r, veDinheiro }: { r: J; veDinheiro: boolean }) {
  const planos = (Array.isArray(r.planos) ? r.planos : []) as J[];
  const pag90 = (r.pagamentos_90d ?? {}) as Record<string, { quantidade: number; valor: number }>;
  const pagantes = n(r.pagantes);
  const receita90 = n(r.receita_90d) + n(r.horas_extras_90d) - n(r.reembolsado_90d);
  const pagamentos90 = n(r.pagamentos_pagos_90d);
  const ticket = pagamentos90 ? (n(r.receita_90d) / pagamentos90) : null;
  const churn = churnMensal(n(r.cancelamentos_90d), pagantes);
  const receitaMensalPorPaganteC = pagantes ? Math.round((receita90 / 3 / pagantes) * 100) : null;
  const ltv = ltvEstimadoC(receitaMensalPorPaganteC, churn);
  const liquidoParcial = n(r.bruto_com_liquido_90d) < n(r.receita_90d);
  const inadimplentes = n(pag90.recusado?.quantidade) + n(r.pendentes_antigas);

  return (
    <section className="flex flex-col gap-4">
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full min-w-[640px] text-sm">
          <caption className="px-4 pt-4 text-left font-black text-slate-900">Planos</caption>
          <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2">Plano</th>
              <th className="px-4 py-2 text-right">Preço</th>
              <th className="px-4 py-2">Periodicidade</th>
              <th className="px-4 py-2">Limite</th>
              <th className="px-4 py-2 text-right">Assinantes</th>
              <th className="px-4 py-2 text-right">Cancelando</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {planos.map((p) => (
              <tr key={String(p.nome)}>
                <td className="px-4 py-2 font-semibold">
                  {nomeDeExibicao(String(p.nome))}
                  {PLANOS_DE_TESTE.has(String(p.nome)) && <span className="ml-2 text-xs font-normal text-slate-500">(teste, fora da vitrine)</span>}
                  {!p.ativo && <span className="ml-2 text-xs font-normal text-slate-500">(inativo)</span>}
                </td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {reais(n(p.preco))}
                  {!PLANOS_DE_TESTE.has(String(p.nome)) && <span className="block text-xs text-slate-500">1º mês −{DESCONTO_PRIMEIRA_MENSALIDADE}%</span>}
                </td>
                <td className="px-4 py-2">{PLANOS_DE_TESTE.has(String(p.nome)) ? "Cobrança única" : "Mensal · BRL"}</td>
                <td className="px-4 py-2">{n(p.horas)} h/mês ({horasPorSemana(n(p.horas))})</td>
                <td className="px-4 py-2 text-right font-bold">{n(p.assinantes)}</td>
                <td className="px-4 py-2 text-right">{n(p.cancelando)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="px-4 pb-3 text-xs text-slate-500">Não há teste grátis público. Cupons de escola cadastrados: {n(r.cupons)} (área Cupons).</p>
      </div>

      {veDinheiro && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Cartao rotulo="Receita recorrente mensal" valor={reais(n(r.mrr))} natureza="calculado" nota="preço cheio das assinaturas sem cancelamento" />
          <Cartao rotulo="Receita recorrente anual" valor={reais(n(r.mrr) * 12)} natureza="calculado" />
          <Cartao rotulo="Receita bruta (90 dias)" valor={reais(n(r.receita_90d) + n(r.horas_extras_90d))} natureza="confirmado" nota="mensalidades + horas extras" />
          <Cartao
            rotulo="Receita líquida (90 dias)"
            valor={reais(n(r.liquido_90d) + (n(r.receita_90d) - n(r.bruto_com_liquido_90d)) + n(r.horas_extras_90d) - n(r.reembolsado_90d))}
            natureza={liquidoParcial ? "parcial" : "confirmado"}
            nota="sem taxas do Asaas e reembolsos"
          />
          <Cartao rotulo="Reembolsos (90 dias)" valor={reais(n(r.reembolsado_90d))} natureza="confirmado" />
          <Cartao rotulo="Ticket médio" valor={reais(ticket)} natureza="calculado" nota="por mensalidade paga (90 dias)" />
          <Cartao rotulo="Cancelamento mensal (aprox.)" valor={formatarValor(churn === null ? null : churn * 100, "percentual")} natureza="estimado" nota="últimos 90 dias" />
          <Cartao rotulo="Valor do cliente (LTV)" valor={reais(ltv === null ? null : ltv / 100)} natureza="estimado" nota={ltv === null ? "sem cancelamentos suficientes para calcular" : "receita mensal por pagante ÷ cancelamento"} />
        </div>
      )}

      <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 md:grid-cols-2 xl:grid-cols-4">
        <Contagem titulo="Assinaturas por status" itens={(r.status ?? {}) as J} vazio="Nenhuma assinatura." />
        <div>
          <h3 className="text-sm font-bold text-slate-700">Pagamentos (90 dias)</h3>
          {Object.keys(pag90).length === 0 ? (
            <p className="text-sm text-slate-500">Nenhum pagamento.</p>
          ) : (
            <ul className="mt-1 space-y-1 text-sm">
              {Object.entries(pag90).map(([status, v]) => (
                <li key={status} className="flex justify-between gap-3 border-b border-slate-100 py-1">
                  <span>{status}</span>
                  <span className="tabular-nums">{v.quantidade}{veDinheiro ? ` · ${reais(n(v.valor))}` : ""}</span>
                </li>
              ))}
            </ul>
          )}
          <p className={`mt-2 text-xs ${inadimplentes ? "font-semibold text-amber-800" : "text-slate-500"}`}>
            Inadimplência: {inadimplentes} (recusados em 90 dias + checkouts pendentes há mais de 3 dias)
          </p>
        </div>
        <Contagem titulo="Motivos de cancelamento" itens={(r.motivos_cancelamento ?? {}) as J} vazio="Nenhum cancelamento." />
        <Contagem titulo="Motivos de reembolso" itens={(r.motivos_reembolso ?? {}) as J} vazio="Nenhum pedido de reembolso." />
      </div>
      <p className="text-xs text-slate-500">Impostos sobre a receita: lance em Custos e ferramentas (categoria Impostos) — não são calculados automaticamente.</p>
    </section>
  );
}
