import Link from "next/link";
import { formatarValor } from "@/lib/admin/formatar";
import { usdParaCentavos } from "@/lib/admin/indicadores";
import { PERIODOS, ROTULO_PERIODO, resolverPeriodo } from "@/lib/admin/periodos";
import { podeAcessar } from "@/lib/admin/permissoes";
import { requireArea } from "@/lib/admin/sessao";
import { ROTULO_STATUS_TUTOR, metricasDosTutores } from "@/lib/admin/tutores";
import { VERSAO_PROMPT_PROFESSOR } from "@/lib/ai/tutor";
import { getCambioUsdBrl } from "@/lib/financeiro/cambio";

export const dynamic = "force-dynamic";

const COR_STATUS: Record<string, string> = {
  ativo: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  teste: "bg-sky-50 text-sky-800 ring-sky-200",
  rascunho: "bg-slate-100 text-slate-700 ring-slate-200",
  pausado: "bg-amber-50 text-amber-900 ring-amber-200",
  arquivado: "bg-slate-100 text-slate-500 ring-slate-200",
};

// Tutores de IA: status e métricas do período (conversas, mensagens, erros,
// tempo de resposta, tokens e custo). Métricas por tutor desde 29/09/2026.
export default async function Tutores({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sessao = await requireArea("tutores");
  const params = await searchParams;
  const periodo = resolverPeriodo(params);
  const veDinheiro = podeAcessar(sessao.funcoes, "custos") || podeAcessar(sessao.funcoes, "financeiro");
  const [tutores, cambio] = await Promise.all([metricasDosTutores(periodo.atual.de, periodo.atual.ate), veDinheiro ? getCambioUsdBrl() : Promise.resolve(null)]);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-violet-700">Operação · {periodo.rotulo}</p>
          <h1 className="mt-1 text-2xl font-black text-slate-950">Tutores de IA</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-500">
            Todos usam o mesmo prompt do professor (versão {VERSAO_PROMPT_PROFESSOR}, em <code>src/lib/ai/tutor.ts</code>) com o modelo Claude
            Haiku 4.5; muda a apresentação e a voz. Versões de prompt por tutor e playground de testes chegam na Fase E.
          </p>
        </div>
        <form method="get" className="flex items-end gap-2">
          <label className="text-xs font-semibold text-slate-600">
            Período
            <select name="periodo" defaultValue={periodo.periodo === "personalizado" ? "30d" : periodo.periodo} className="mt-1 block rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm">
              {PERIODOS.filter((p) => p !== "personalizado").map((p) => (
                <option key={p} value={p}>{ROTULO_PERIODO[p]}</option>
              ))}
            </select>
          </label>
          <button type="submit" className="rounded-lg bg-violet-700 px-4 py-2 text-sm font-bold text-white hover:bg-violet-800">Aplicar</button>
        </form>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {tutores.map((t) => {
          const taxaErro = t.chamadas ? (t.erros / t.chamadas) * 100 : null;
          return (
            <article key={t.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-lg font-black text-slate-900">{t.nome}</h2>
                  <p className="text-xs text-slate-500">{[t.faixa_etaria, t.genero].filter(Boolean).join(" · ") || "—"}</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-bold ring-1 ${COR_STATUS[t.status] ?? COR_STATUS.rascunho}`}>{ROTULO_STATUS_TUTOR[t.status] ?? t.status}</span>
              </div>
              {t.descricao && <p className="line-clamp-3 text-sm text-slate-600">{t.descricao}</p>}
              <dl className="grid grid-cols-3 gap-2 text-sm">
                <div><dt className="text-xs text-slate-500">Alunos hoje</dt><dd className="font-bold">{t.alunos_atuais}</dd></div>
                <div><dt className="text-xs text-slate-500">Atendidos</dt><dd className="font-bold">{t.alunos_atendidos}</dd></div>
                <div><dt className="text-xs text-slate-500">Conversas</dt><dd className="font-bold">{t.conversas}</dd></div>
                <div><dt className="text-xs text-slate-500">Mensagens</dt><dd className="font-bold">{t.mensagens}</dd></div>
                <div><dt className="text-xs text-slate-500">Taxa de erro</dt><dd className="font-bold">{formatarValor(taxaErro, "percentual")}</dd></div>
                <div><dt className="text-xs text-slate-500">Resposta</dt><dd className="font-bold">{formatarValor(t.latencia_media_ms, "ms")}</dd></div>
                {veDinheiro && (
                  <div className="col-span-3">
                    <dt className="text-xs text-slate-500">Custo estimado</dt>
                    <dd className="font-bold">
                      {cambio ? formatarValor(usdParaCentavos(t.custo_usd, cambio.taxa) / 100, "reais") : formatarValor(t.custo_usd, "dolares")}
                      {t.conversas > 0 && cambio && (
                        <span className="ml-2 text-xs font-normal text-slate-500">
                          {formatarValor(usdParaCentavos(t.custo_usd, cambio.taxa) / 100 / t.conversas, "reais")} por conversa
                        </span>
                      )}
                    </dd>
                  </div>
                )}
              </dl>
              <Link href={`/admin/tutores/${t.id}`} className="mt-auto text-sm font-bold text-violet-700 hover:underline">Abrir e editar →</Link>
            </article>
          );
        })}
      </div>
    </div>
  );
}
