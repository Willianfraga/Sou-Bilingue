import { Paginacao, numeroDaPagina } from "@/components/admin/Paginacao";
import { ResumoAssinaturas } from "@/components/admin/ResumoAssinaturas";
import { STATUS_ASSINATURA, listarAssinaturas } from "@/lib/admin/assinaturas";
import { formatarData } from "@/lib/admin/formatar";
import { podeAcessar } from "@/lib/admin/permissoes";
import { requireArea } from "@/lib/admin/sessao";
import { getResumoAssinaturas } from "@/lib/financeiro/dados";
import { formatarPreco, nomeDeExibicao } from "@/lib/billing/planos";

export const dynamic = "force-dynamic";

const COR: Record<string, string> = {
  ativa: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  pendente: "bg-amber-50 text-amber-900 ring-amber-200",
  cancelada: "bg-slate-100 text-slate-700 ring-slate-200",
  pausada: "bg-slate-100 text-slate-700 ring-slate-200",
};

// Assinaturas (tabela subscriptions). Só acompanhamento: cobrança e
// cancelamento acontecem pelo Asaas e pelo próprio aluno (Minha assinatura).
export default async function Assinaturas({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sessao = await requireArea("assinaturas");
  const params = await searchParams;
  const pagina = numeroDaPagina(params.pagina);
  const porPagina = 25;
  const [{ linhas, total }, resumo] = await Promise.all([listarAssinaturas({ pagina, porPagina, status: params.status }), getResumoAssinaturas()]);
  const veDinheiro = podeAcessar(sessao.funcoes, "financeiro") || podeAcessar(sessao.funcoes, "custos");

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-violet-700">Dinheiro</p>
        <h1 className="mt-1 text-2xl font-black text-slate-950">Assinaturas e receitas</h1>
        <p className="mt-1 text-sm text-slate-500">Cobrança pelo Asaas. Cancelamento e reembolso são feitos pelo aluno em Minha assinatura.</p>
      </div>

      <ResumoAssinaturas r={resumo} veDinheiro={veDinheiro} />

      <h2 className="text-lg font-black text-slate-900">Todas as assinaturas</h2>
      <form method="get" className="flex flex-wrap items-end gap-3">
        <label className="text-xs font-semibold text-slate-600">
          Status
          <select name="status" defaultValue={params.status ?? ""} className="mt-1 block rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm">
            <option value="">Todos</option>
            {STATUS_ASSINATURA.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
        <button type="submit" className="rounded-lg bg-violet-700 px-4 py-2 text-sm font-bold text-white hover:bg-violet-800">Filtrar</button>
      </form>

      {linhas.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">Nenhuma assinatura com esses filtros.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Aluno</th>
                <th className="px-4 py-3">Plano</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Criada em</th>
                <th className="px-4 py-3">Próxima renovação</th>
                <th className="px-4 py-3">Cancelamento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {linhas.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-3 font-semibold">{s.nomeAluno}</td>
                  <td className="px-4 py-3">
                    {s.plano ? nomeDeExibicao(s.plano) : "—"}
                    {s.preco !== null && <span className="block text-xs text-slate-500">{formatarPreco(s.preco)}/mês</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ring-1 ${COR[s.status] ?? COR.cancelada}`}>{s.status}</span>
                    {!s.asaas && s.status === "ativa" && <span className="mt-1 block text-xs text-amber-800">sem assinatura no Asaas</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{formatarData(s.criada_em)}</td>
                  <td className="px-4 py-3 text-slate-600">{s.cancelamento_solicitado_em ? "—" : s.proxima_renovacao ? formatarData(s.proxima_renovacao) : "—"}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {s.cancelamento_solicitado_em ? (
                      <>
                        Pedido em {formatarData(s.cancelamento_solicitado_em)}
                        {s.acesso_ate && <span className="block text-xs">acesso até {formatarData(s.acesso_ate)}</span>}
                        {s.motivo_cancelamento && <span className="block text-xs">motivo: {s.motivo_cancelamento}</span>}
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Paginacao pagina={pagina} porPagina={porPagina} total={total} base="/admin/assinaturas" params={params} />
    </div>
  );
}
