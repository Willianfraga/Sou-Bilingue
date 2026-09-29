import Link from "next/link";
import { notFound } from "next/navigation";
import { FormFornecedor } from "@/components/admin/FormFornecedor";
import { listarAuditoria } from "@/lib/admin/auditoria";
import { formatarDataHora } from "@/lib/admin/formatar";
import { requireArea } from "@/lib/admin/sessao";
import { buscarFornecedor } from "@/lib/financeiro/dados";

export const dynamic = "force-dynamic";

// Edição do fornecedor + histórico de valores (auditoria com antes/depois).
export default async function EditarFornecedor({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ erro?: string }> }) {
  await requireArea("ferramentas");
  const { id } = await params;
  const { erro } = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const f = await buscarFornecedor(id);
  if (!f) notFound();
  const { linhas } = await listarAuditoria({ pagina: 1, porPagina: 100, entidade: "fornecedor" });
  const historico = linhas.filter((l) => l.entidade_id === id);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <Link href="/admin/custos" className="text-sm font-semibold text-violet-700 hover:underline">← Custos e ferramentas</Link>
      <h1 className="text-2xl font-black text-slate-950">{f.nome}</h1>
      {erro && <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">{erro}</p>}
      <FormFornecedor fornecedor={f} />
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="font-black text-slate-900">Histórico de valores</h2>
        {historico.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">Sem alterações registradas.</p>
        ) : (
          <ul className="mt-2 space-y-2 text-sm">
            {historico.map((h) => {
              const antes = (h.antes ?? {}) as Record<string, unknown>;
              const depois = (h.depois ?? {}) as Record<string, unknown>;
              return (
                <li key={h.id} className="border-b border-slate-100 pb-2">
                  <span className="text-slate-500">{formatarDataHora(h.criado_em)}</span> · {h.nomeAdmin ?? "—"} · {h.acao}
                  {"valor_fixo_mensal" in depois && (
                    <span className="block">
                      Valor fixo: {String(antes.valor_fixo_mensal ?? "—")} → {String(depois.valor_fixo_mensal ?? "—")} ({String(depois.moeda ?? "")})
                    </span>
                  )}
                  {h.motivo && <span className="block text-slate-600">Motivo: {h.motivo}</span>}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
