import Link from "next/link";
import { notFound } from "next/navigation";
import { listarAuditoria } from "@/lib/admin/auditoria";
import { formatarDataHora, formatarValor } from "@/lib/admin/formatar";
import { resolverPeriodo } from "@/lib/admin/periodos";
import { requireArea } from "@/lib/admin/sessao";
import { ROTULO_STATUS_TUTOR, STATUS_TUTOR, metricasDosTutores } from "@/lib/admin/tutores";
import { VERSAO_PROMPT_PROFESSOR } from "@/lib/ai/tutor";
import { salvarTutor } from "../actions";

export const dynamic = "force-dynamic";

// Ficha do tutor: dados, status (com aviso de impacto), métricas dos
// últimos 30 dias e histórico de alterações (da auditoria).
export default async function FichaDoTutor({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; erro?: string }> }) {
  const sessao = await requireArea("tutores");
  const { id } = await params;
  const aviso = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const periodo = resolverPeriodo({ periodo: "30d" });
  const tutores = await metricasDosTutores(periodo.atual.de, periodo.atual.ate);
  const t = tutores.find((x) => x.id === id);
  if (!t) notFound();
  const { linhas: historico } = await listarAuditoria({ pagina: 1, porPagina: 20, entidade: "tutor" });
  const doTutor = historico.filter((h) => h.entidade_id === id);
  const podeEditar = sessao.funcoes.some((f) => f === "geral" || f === "pedagogico");
  const campo = "mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm";

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5">
      <Link href="/admin/tutores" className="text-sm font-semibold text-violet-700 hover:underline">← Tutores</Link>
      <div>
        <h1 className="text-2xl font-black text-slate-950">{t.nome}</h1>
        <p className="text-sm text-slate-500">
          Status: {ROTULO_STATUS_TUTOR[t.status]} · {t.alunos_atuais} aluno(s) usando hoje
          {t.atualizado_em && ` · alterado em ${formatarDataHora(t.atualizado_em)}${t.atualizado_por ? ` por ${t.atualizado_por}` : ""}`}
        </p>
      </div>
      {aviso.ok && <p role="status" className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-900">Salvo e registrado na auditoria.</p>}
      {aviso.erro && <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">{aviso.erro}</p>}

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="font-black text-slate-900">Últimos 30 dias</h2>
        <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div><dt className="text-xs text-slate-500">Alunos atendidos</dt><dd className="font-bold">{t.alunos_atendidos}</dd></div>
          <div><dt className="text-xs text-slate-500">Conversas</dt><dd className="font-bold">{t.conversas}</dd></div>
          <div><dt className="text-xs text-slate-500">Mensagens</dt><dd className="font-bold">{t.mensagens}</dd></div>
          <div><dt className="text-xs text-slate-500">Erros</dt><dd className="font-bold">{t.erros} de {t.chamadas}</dd></div>
          <div><dt className="text-xs text-slate-500">Tempo de resposta</dt><dd className="font-bold">{formatarValor(t.latencia_media_ms, "ms")}</dd></div>
          <div><dt className="text-xs text-slate-500">Tokens entrada</dt><dd className="font-bold">{formatarValor(t.tokens_entrada, "numero")}</dd></div>
          <div><dt className="text-xs text-slate-500">Tokens saída</dt><dd className="font-bold">{formatarValor(t.tokens_saida, "numero")}</dd></div>
          <div><dt className="text-xs text-slate-500">Custo (US$, estimado)</dt><dd className="font-bold">{formatarValor(t.custo_usd, "dolares")}</dd></div>
        </dl>
        <p className="mt-3 text-xs text-slate-500">
          Modelo: Claude Haiku 4.5 (Anthropic) · prompt do professor versão {VERSAO_PROMPT_PROFESSOR} (igual para todos os tutores). Avaliação dos alunos,
          denúncias e assuntos mais estudados dependem de instrumentação das próximas fases.
        </p>
      </section>

      {podeEditar ? (
        <form action={salvarTutor} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5">
          <input type="hidden" name="id" value={t.id} />
          <h2 className="font-black text-slate-900">Editar</h2>
          <label className="text-sm font-semibold">
            Nome
            <input name="nome" defaultValue={t.nome} required maxLength={40} className={campo} />
          </label>
          <label className="text-sm font-semibold">
            Descrição
            <textarea name="descricao" defaultValue={t.descricao ?? ""} maxLength={300} rows={3} className={campo} />
          </label>
          <label className="text-sm font-semibold">
            Status
            <select name="status" defaultValue={t.status} className={campo}>
              {STATUS_TUTOR.map((s) => (
                <option key={s} value={s}>{ROTULO_STATUS_TUTOR[s]}</option>
              ))}
            </select>
          </label>
          {t.alunos_atuais > 0 && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {t.alunos_atuais} aluno(s) usam este tutor. Fora de &quot;Ativo&quot;, ele some da lista de escolha, mas quem já usa continua até trocar.
            </p>
          )}
          <label className="text-sm font-semibold">
            Motivo da alteração
            <input name="motivo" required minLength={5} maxLength={500} className={campo} />
          </label>
          <button type="submit" className="w-fit rounded-lg bg-violet-700 px-4 py-2 text-sm font-bold text-white hover:bg-violet-800">Salvar</button>
        </form>
      ) : (
        <p className="text-sm text-slate-500">Sua função permite ver, mas não editar tutores.</p>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="font-black text-slate-900">Histórico de alterações</h2>
        {doTutor.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">Nenhuma alteração registrada pelo painel.</p>
        ) : (
          <ul className="mt-2 space-y-2 text-sm">
            {doTutor.map((h) => (
              <li key={h.id} className="border-b border-slate-100 pb-2">
                <span className="text-slate-500">{formatarDataHora(h.criado_em)}</span> · {h.nomeAdmin ?? "—"} · {h.resultado}
                {h.motivo && <span className="block text-slate-700">Motivo: {h.motivo}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
