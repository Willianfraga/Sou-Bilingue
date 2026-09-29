import { Paginacao, numeroDaPagina } from "@/components/admin/Paginacao";
import { listarAuditoria } from "@/lib/admin/auditoria";
import { formatarDataHora } from "@/lib/admin/formatar";
import { inicioDoDia } from "@/lib/admin/periodos";
import { requireArea } from "@/lib/admin/sessao";

export const dynamic = "force-dynamic";

const ENTIDADES = ["area", "aluno", "conversa", "tutor", "reembolso", "preco", "configuracao"];
const COR = { ok: "text-emerald-700", erro: "text-red-700", negado: "text-amber-800" } as Record<string, string>;
const dia = (v?: string) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);

// Trilha de auditoria do painel (tabela admin_auditoria, só acréscimo).
export default async function Logs({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireArea("logs");
  const params = await searchParams;
  const pagina = numeroDaPagina(params.pagina);
  const porPagina = 50;
  const de = dia(params.de);
  const ate = dia(params.ate);
  const filtros = {
    entidade: ENTIDADES.includes(params.entidade ?? "") ? params.entidade : undefined,
    resultado: ["ok", "erro", "negado"].includes(params.resultado ?? "") ? params.resultado : undefined,
    de: de ? inicioDoDia(de).toISOString() : undefined,
    ate: ate ? new Date(inicioDoDia(ate).getTime() + 86_400_000).toISOString() : undefined,
  };
  const { linhas, total } = await listarAuditoria({ pagina, porPagina, ...filtros });
  const exportar = new URLSearchParams(Object.entries(params).filter(([k, v]) => v && k !== "pagina") as [string, string][]).toString();

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-violet-700">Sistema</p>
          <h1 className="mt-1 text-2xl font-black text-slate-950">Logs e auditoria</h1>
          <p className="mt-1 text-sm text-slate-500">
            Toda ação do painel fica aqui: quem, o quê, quando, motivo e resultado. Senhas, tokens e chaves nunca são gravados.
          </p>
        </div>
        <a href={`/admin/logs/exportar${exportar ? `?${exportar}` : ""}`} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50">
          Exportar CSV
        </a>
      </div>

      <form method="get" className="grid grid-cols-2 gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-5">
        <label className="text-xs font-semibold text-slate-600">
          Entidade
          <select name="entidade" defaultValue={filtros.entidade ?? ""} className="mt-1 block w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm">
            <option value="">Todas</option>
            {ENTIDADES.map((e) => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-600">
          Resultado
          <select name="resultado" defaultValue={filtros.resultado ?? ""} className="mt-1 block w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm">
            <option value="">Todos</option>
            <option value="ok">ok</option>
            <option value="erro">erro</option>
            <option value="negado">negado</option>
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-600">
          De
          <input type="date" name="de" defaultValue={de} className="mt-1 block w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm" />
        </label>
        <label className="text-xs font-semibold text-slate-600">
          Até
          <input type="date" name="ate" defaultValue={ate} className="mt-1 block w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm" />
        </label>
        <div className="flex items-end">
          <button type="submit" className="w-full rounded-lg bg-violet-700 px-4 py-2 text-sm font-bold text-white hover:bg-violet-800">Filtrar</button>
        </div>
      </form>

      {linhas.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">Nenhum registro com esses filtros.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {linhas.map((l) => (
            <li key={l.id} className="rounded-2xl border border-slate-200 bg-white p-4 text-sm">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="text-slate-500">{formatarDataHora(l.criado_em)}</span>
                <span className="font-semibold">{l.nomeAdmin ?? "sistema"}</span>
                <span className="font-mono text-xs">{l.acao}</span>
                <span className="text-slate-500">
                  {l.entidade}
                  {l.entidade_id ? ` · ${l.entidade_id}` : ""}
                </span>
                <span className={`font-bold ${COR[l.resultado] ?? ""}`}>{l.resultado}</span>
                {l.ip && <span className="text-xs text-slate-400">IP {l.ip}</span>}
              </div>
              {l.motivo && <p className="mt-1 text-slate-700">Motivo: {l.motivo}</p>}
              {(l.antes !== null || l.depois !== null) && (
                <details className="mt-1 text-xs">
                  <summary className="cursor-pointer font-semibold text-violet-700">Antes e depois</summary>
                  <pre className="mt-1 overflow-x-auto rounded-lg bg-slate-50 p-2">{JSON.stringify({ antes: l.antes, depois: l.depois }, null, 2)}</pre>
                </details>
              )}
            </li>
          ))}
        </ul>
      )}
      <Paginacao pagina={pagina} porPagina={porPagina} total={total} base="/admin/logs" params={params} />
    </div>
  );
}
