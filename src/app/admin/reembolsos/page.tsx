import { formatarPreco } from "@/lib/billing/planos";
import { listarReembolsosParaAdmin } from "@/lib/billing/reembolso";
import { MOTIVOS_DE_EXCECAO, ROTULO_STATUS, formatarDataHoraBrasilia } from "@/lib/billing/regras-reembolso";
import { agirNoReembolso } from "./actions";

export const dynamic = "force-dynamic";

const ATOR: Record<string, string> = { aluno: "Aluno", admin: "Admin", webhook: "Asaas (webhook)", sistema: "Sistema" };

// Pedidos de reembolso (política: docs/refund-policy.md). Histórico só
// cresce: nada aqui altera eventos anteriores. "Reembolsado" só vem do Asaas.
export default async function ReembolsosAdmin({ searchParams }: { searchParams: Promise<{ ok?: string; erro?: string }> }) {
  const aviso = await searchParams;
  const lista = await listarReembolsosParaAdmin();

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <div>
        <span className="font-mono text-xs uppercase tracking-widest text-neutral-400">Pagamentos</span>
        <h1 className="mt-1 text-2xl font-bold">Reembolsos</h1>
        <p className="mt-2 text-sm text-neutral-500">
          Dentro dos 7 dias o estorno é enviado ao Asaas automaticamente. Fora do prazo o pedido fica &quot;Em análise&quot;:
          aprove só com hipótese legal (cobrança indevida, duplicidade, falha na prestação, descumprimento da oferta). Toda decisão
          exige justificativa e fica registrada.
        </p>
      </div>

      {aviso.ok && <p role="status" className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-900">Registrado.</p>}
      {aviso.erro && <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">{aviso.erro}</p>}

      {lista.length === 0 ? (
        <p className="rounded-lg border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500">Nenhum pedido de reembolso.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {lista.map((p) => (
            <li key={p.id} className="rounded-lg border border-neutral-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">
                  {p.nomeAluno} <span className="font-mono text-xs font-normal text-neutral-500">{p.protocolo}</span>
                </p>
                <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-semibold">{ROTULO_STATUS[p.status]}</span>
              </div>
              <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
                <dt className="text-neutral-500">Valor</dt>
                <dd>{formatarPreco(Number(p.valor))}</dd>
                <dt className="text-neutral-500">Pedido em</dt>
                <dd>{formatarDataHoraBrasilia(new Date(p.solicitado_em))}</dd>
                <dt className="text-neutral-500">Prazo de 7 dias</dt>
                <dd>
                  {p.dentro_do_prazo ? "Dentro" : "Fora"} (até {formatarDataHoraBrasilia(new Date(p.prazo_final))})
                </dd>
                <dt className="text-neutral-500">Motivo</dt>
                <dd>
                  {p.motivo ?? "Não informado"}
                  {p.motivo && MOTIVOS_DE_EXCECAO.has(p.motivo) && (
                    <span className="ml-1 rounded bg-amber-100 px-1 text-xs text-amber-900">prioridade</span>
                  )}
                </dd>
              </dl>
              {p.comentario && <blockquote className="mt-2 text-sm text-neutral-700">&ldquo;{p.comentario}&rdquo;</blockquote>}
              {p.erro && <p className="mt-2 text-sm text-red-700">Erro: {p.erro}</p>}
              <p className="mt-1 font-mono text-xs text-neutral-400">Cobrança Asaas {p.asaas_payment_id}</p>

              <form action={agirNoReembolso} className="mt-3 flex flex-col gap-2">
                <input type="hidden" name="id" value={p.id} />
                <label className="sr-only" htmlFor={`texto-${p.id}`}>Justificativa ou observação</label>
                <textarea
                  id={`texto-${p.id}`}
                  name="texto"
                  rows={2}
                  maxLength={1000}
                  required
                  placeholder="Justificativa (obrigatória para decisões) ou observação interna"
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                />
                <div className="flex flex-wrap gap-2">
                  {(p.status === "UNDER_REVIEW" || p.status === "REQUESTED") && (
                    <>
                      <button name="acao" value="aprovar" className="rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800">
                        Aprovar e estornar
                      </button>
                      <button name="acao" value="negar" className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50">
                        Negar
                      </button>
                    </>
                  )}
                  {p.status === "FAILED" && (
                    <button name="acao" value="reprocessar" className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-neutral-700">
                      Reprocessar estorno
                    </button>
                  )}
                  <button name="acao" value="anotar" className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-semibold hover:bg-neutral-50">
                    Só anotar
                  </button>
                </div>
              </form>

              <details className="mt-3 text-sm">
                <summary className="cursor-pointer text-neutral-600">Histórico ({p.eventos.length})</summary>
                <ol className="mt-2 space-y-1 border-l border-neutral-200 pl-3">
                  {p.eventos.map((e) => (
                    <li key={e.id}>
                      <span className="text-neutral-500">{formatarDataHoraBrasilia(new Date(e.criado_em))}</span> · {ATOR[e.ator] ?? e.ator}
                      {e.nomeAtor && ` (${e.nomeAtor})`} · <span className="font-mono text-xs">{e.tipo}</span>
                      {e.status_anterior && e.status_novo && ` ${e.status_anterior} → ${e.status_novo}`}
                      {e.observacao && <span className="block text-neutral-600">{e.observacao}</span>}
                    </li>
                  ))}
                </ol>
              </details>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
