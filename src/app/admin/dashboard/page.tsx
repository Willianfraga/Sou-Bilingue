import { SecaoIndicadores } from "@/components/admin/CartaoIndicador";
import { FiltrosPainel } from "@/components/admin/FiltrosPainel";
import { formatarData, formatarValor } from "@/lib/admin/formatar";
import { usdParaCentavos } from "@/lib/admin/indicadores";
import { requireArea } from "@/lib/admin/sessao";
import { getVisaoGeral } from "@/lib/admin/visao-geral";

export const dynamic = "force-dynamic";

const SERVICO: Record<string, string> = { llm: "Texto (tutor e assistente)", tts: "Voz premium (síntese)", stt: "Transcrição de voz" };
const ORIGEM: Record<string, string> = { aula: "Aulas", assistente_vendas: "Assistente da página de vendas", admin_teste: "Testes do painel" };

type Linha = { chave: string; nome: string; chamadas: number; erros?: number; custo: number };

// Custos de IA do período: por serviço, modelo, tutor e origem. Tudo
// ESTIMADO pela tabela de preços (precos_ia); a fatura do provedor é o valor
// confirmado (cadastro em Financeiro, próxima fase).
export default async function CustosDeIa({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireArea("custos");
  const filtros = await searchParams;
  const v = await getVisaoGeral(filtros);
  const ia = (v.bruto.ia ?? {}) as Record<string, unknown>;
  const taxa = v.cambio?.taxa ?? null;
  const brl = (usd: number) => (taxa ? formatarValor(usdParaCentavos(usd, taxa) / 100, "reais") : "—");

  const deObjeto = (o: unknown, nomes: Record<string, string>): Linha[] =>
    Object.entries((o ?? {}) as Record<string, { chamadas: number; erros?: number; custo_usd: number }>)
      .map(([k, x]) => ({ chave: k, nome: nomes[k] ?? k, chamadas: Number(x.chamadas), erros: x.erros === undefined ? undefined : Number(x.erros), custo: Number(x.custo_usd) }))
      .sort((a, b) => b.custo - a.custo);
  const porServico = deObjeto(ia.por_servico, SERVICO);
  const porOrigem = deObjeto(ia.por_origem, ORIGEM);
  const porModelo: Linha[] = ((ia.por_modelo ?? []) as Array<{ provedor: string; modelo: string; chamadas: number; erros: number; custo_usd: number }>).map((m) => ({
    chave: `${m.provedor}:${m.modelo}`,
    nome: `${m.modelo} (${m.provedor})`,
    chamadas: Number(m.chamadas),
    erros: Number(m.erros),
    custo: Number(m.custo_usd),
  }));
  const porTutor: Linha[] = ((ia.por_tutor ?? []) as Array<{ tutor_id: string; nome: string | null; chamadas: number; custo_usd: number }>).map((t) => ({
    chave: t.tutor_id,
    nome: t.nome ?? "Tutor removido",
    chamadas: Number(t.chamadas),
    custo: Number(t.custo_usd),
  }));

  const tabela = (titulo: string, linhas: Linha[], nota?: string) => (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <h2 className="font-black text-slate-900">{titulo}</h2>
      {nota && <p className="text-xs text-slate-500">{nota}</p>}
      {linhas.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">Sem consumo no período.</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[420px] text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="py-2">Item</th>
                <th className="py-2 text-right">Chamadas</th>
                {linhas.some((l) => l.erros !== undefined) && <th className="py-2 text-right">Erros</th>}
                <th className="py-2 text-right">US$</th>
                <th className="py-2 text-right">R$</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 tabular-nums">
              {linhas.map((l) => (
                <tr key={l.chave}>
                  <td className="py-2 font-semibold">{l.nome}</td>
                  <td className="py-2 text-right">{l.chamadas}</td>
                  {linhas.some((x) => x.erros !== undefined) && <td className="py-2 text-right">{l.erros ?? "—"}</td>}
                  <td className="py-2 text-right">{formatarValor(l.custo, "dolares")}</td>
                  <td className="py-2 text-right">{brl(l.custo)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-violet-700">Dinheiro · {v.periodo.rotulo}</p>
        <h1 className="mt-1 text-2xl font-black text-slate-950">Custos de IA</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-500">
          Valores <strong>estimados</strong> com a tabela de preços do painel. O valor confirmado é a fatura de cada provedor.
          {v.cambio && ` Câmbio: PTAX de ${formatarData(v.cambio.data)} (R$ ${v.cambio.taxa.toFixed(4).replace(".", ",")}).`}
        </p>
      </div>
      <FiltrosPainel periodo={v.periodo.periodo} de={filtros.de} ate={filtros.ate} idioma={v.filtros.idioma} plano={v.filtros.plano} tutor={v.filtros.tutor} opcoes={v.opcoes} />
      <SecaoIndicadores titulo="Resumo" itens={v.secoes.ia} />
      <div className="grid gap-4 lg:grid-cols-2">
        {tabela("Por serviço", porServico)}
        {tabela("Por origem", porOrigem, "Aulas dos alunos × assistente de dúvidas da página de vendas.")}
        {tabela("Por modelo", porModelo)}
        {tabela("Por tutor", porTutor, "Custo por tutor registrado desde 29/09/2026.")}
      </div>
    </div>
  );
}
