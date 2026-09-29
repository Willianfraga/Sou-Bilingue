import Link from "next/link";
import { Paginacao, numeroDaPagina } from "@/components/admin/Paginacao";
import { ROTULO_ALERTA, ROTULO_SITUACAO, SITUACOES, listarAlunos, mascararEmail } from "@/lib/admin/alunos";
import { formatarData, formatarValor } from "@/lib/admin/formatar";
import { usdParaCentavos } from "@/lib/admin/indicadores";
import { podeAcessar } from "@/lib/admin/permissoes";
import { requireArea } from "@/lib/admin/sessao";
import { nomeDeExibicao } from "@/lib/billing/planos";
import { getCambioUsdBrl } from "@/lib/financeiro/cambio";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { NOME_DO_IDIOMA } from "@/lib/types";

export const dynamic = "force-dynamic";

// Alunos: busca, filtros e paginação no servidor. E-mail mascarado na lista
// (completo só na ficha, com acesso registrado). Dinheiro só para quem tem
// função financeira ou de análise.
export default async function Alunos({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sessao = await requireArea("alunos");
  const params = await searchParams;
  const pagina = numeroDaPagina(params.pagina);
  const porPagina = 25;
  const veDinheiro = podeAcessar(sessao.funcoes, "custos") || podeAcessar(sessao.funcoes, "financeiro");
  const [{ linhas, total }, cambio, { data: planos }] = await Promise.all([
    listarAlunos({ pagina, porPagina, busca: params.busca, plano: params.plano, idioma: params.idioma, situacao: params.situacao }),
    veDinheiro ? getCambioUsdBrl() : Promise.resolve(null),
    createSupabaseAdminClient().from("planos").select("nome").order("ordem"),
  ]);
  const campo = "mt-1 block w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm";

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-violet-700">Operação</p>
        <h1 className="mt-1 text-2xl font-black text-slate-950">Alunos</h1>
        <p className="mt-1 text-sm text-slate-500">Alertas são pistas para revisão humana, não decisões automáticas.</p>
      </div>

      <form method="get" className="grid grid-cols-2 gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-5">
        <label className="col-span-2 text-xs font-semibold text-slate-600 md:col-span-1">
          Buscar (nome ou e-mail)
          <input name="busca" defaultValue={params.busca} maxLength={80} className={campo} />
        </label>
        <label className="text-xs font-semibold text-slate-600">
          Situação
          <select name="situacao" defaultValue={params.situacao ?? ""} className={campo}>
            <option value="">Todas</option>
            {SITUACOES.map((s) => (
              <option key={s} value={s}>{ROTULO_SITUACAO[s]}</option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-600">
          Plano
          <select name="plano" defaultValue={params.plano ?? ""} className={campo}>
            <option value="">Todos</option>
            {(planos ?? []).map((p) => (
              <option key={p.nome} value={p.nome}>{nomeDeExibicao(p.nome)}</option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-600">
          Idioma
          <select name="idioma" defaultValue={params.idioma ?? ""} className={campo}>
            <option value="">Todos</option>
            {Object.entries(NOME_DO_IDIOMA).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </label>
        <div className="flex items-end">
          <button type="submit" className="w-full rounded-lg bg-violet-700 px-4 py-2 text-sm font-bold text-white hover:bg-violet-800">Filtrar</button>
        </div>
      </form>

      {linhas.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">Nenhum aluno com esses filtros.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Aluno</th>
                <th className="px-4 py-3">Plano</th>
                <th className="px-4 py-3">Último acesso</th>
                <th className="px-4 py-3 text-right">Estudo</th>
                {veDinheiro && <th className="px-4 py-3 text-right">Custo IA</th>}
                {veDinheiro && <th className="px-4 py-3 text-right">Receita</th>}
                <th className="px-4 py-3">Alertas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {linhas.map((a) => (
                <tr key={a.id} className="align-top">
                  <td className="px-4 py-3">
                    <Link href={`/admin/alunos/${a.id}`} className="font-bold text-violet-800 hover:underline">{a.nome}</Link>
                    <span className="block text-xs text-slate-500">{mascararEmail(a.email)} · {NOME_DO_IDIOMA[a.idioma as keyof typeof NOME_DO_IDIOMA] ?? a.idioma}</span>
                    {a.suspenso_em && <span className="mt-1 inline-block rounded bg-red-50 px-1.5 py-0.5 text-xs font-bold text-red-800">suspenso</span>}
                  </td>
                  <td className="px-4 py-3">
                    {a.plano ? nomeDeExibicao(a.plano) : "—"}
                    <span className="block text-xs text-slate-500">{a.status_assinatura ?? "sem assinatura"}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{a.ultimo_acesso ? formatarData(a.ultimo_acesso) : "nunca"}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatarValor(a.segundos_estudo / 3600, "horas")}</td>
                  {veDinheiro && (
                    <td className="px-4 py-3 text-right tabular-nums">
                      {cambio ? formatarValor(usdParaCentavos(a.custo_usd, cambio.taxa) / 100, "reais") : formatarValor(a.custo_usd, "dolares")}
                    </td>
                  )}
                  {veDinheiro && <td className="px-4 py-3 text-right tabular-nums">{formatarValor(a.receita, "reais")}</td>}
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {a.alertas.map((al) => (
                        <span key={al} title={ROTULO_ALERTA[al]?.ajuda} className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-900 ring-1 ring-amber-200">
                          ⚠ {ROTULO_ALERTA[al]?.texto ?? al}
                        </span>
                      ))}
                      {a.alertas.length === 0 && <span className="text-xs text-slate-400">—</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Paginacao pagina={pagina} porPagina={porPagina} total={total} base="/admin/alunos" params={params} />
    </div>
  );
}
