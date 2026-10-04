import Link from "next/link";
import { notFound } from "next/navigation";
import { detalheAluno } from "@/lib/admin/alunos";
import { registrarAuditoria } from "@/lib/admin/auditoria";
import { formatarData, formatarDataHora, formatarValor } from "@/lib/admin/formatar";
import { centavos, reaisDe, usdParaCentavos } from "@/lib/admin/indicadores";
import { podeAcessar } from "@/lib/admin/permissoes";
import { requireArea } from "@/lib/admin/sessao";
import { extratoDeHoras } from "@/lib/billing/extrato";
import { rotuloDoExtrato, valorDoExtrato } from "@/lib/billing/horas";
import { nomeDeExibicao } from "@/lib/billing/planos";
import { getCambioUsdBrl } from "@/lib/financeiro/cambio";
import { NOME_DO_IDIOMA } from "@/lib/types";
import { agirNoAluno } from "./actions";

export const dynamic = "force-dynamic";

type J = Record<string, unknown>;
const n = (v: unknown) => Number(v ?? 0) || 0;
const lista = (v: unknown) => (Array.isArray(v) ? (v as J[]) : []);
const texto = (v: unknown) => (v === null || v === undefined || v === "" ? "—" : Array.isArray(v) ? v.join(", ") : String(v));

function Bloco({ titulo, children, nota }: { titulo: string; children: React.ReactNode; nota?: string }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="font-black text-slate-900">{titulo}</h2>
      {nota && <p className="text-xs text-slate-500">{nota}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Dado({ rotulo, valor }: { rotulo: string; valor: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{rotulo}</dt>
      <dd className="font-semibold text-slate-900">{valor}</dd>
    </div>
  );
}

// Ficha do aluno. Abrir a ficha fica registrado (mostra e-mail completo e
// dados pessoais). O texto das conversas não aparece aqui: leitura auditada
// na central de Conversas (próxima fase).
export default async function FichaDoAluno({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; erro?: string }> }) {
  const sessao = await requireArea("alunos");
  const { id } = await params;
  const aviso = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const d = await detalheAluno(id);
  if (!d) notFound();
  await registrarAuditoria({ adminId: sessao.userId, acao: "aluno.visualizar", entidade: "aluno", entidadeId: id, resultado: "ok" });

  const veDinheiro = podeAcessar(sessao.funcoes, "custos") || podeAcessar(sessao.funcoes, "financeiro");
  const podeSuspender = sessao.funcoes.some((f) => f === "geral" || f === "suporte");
  const podeAnonimizar = sessao.funcoes.includes("geral");
  const cambio = veDinheiro ? await getCambioUsdBrl() : null;
  const extrato = await extratoDeHoras(id, 30);

  const p = d.perfil;
  const entrevista = (d.entrevista ?? null) as J | null;
  const estudo = (d.estudo ?? {}) as J;
  const consumo = (d.consumo ?? {}) as J;
  const pagamentos = lista(d.pagamentos);
  const extras = lista(d.horas_extras);
  const reembolsos = lista(d.reembolsos);
  const receitaC =
    pagamentos.filter((x) => x.status === "pago" || x.status === "estornado").reduce((s, x) => s + centavos(n(x.valor)), 0) +
    extras.filter((x) => x.status === "ativa").reduce((s, x) => s + centavos(n(x.valor)), 0) -
    reembolsos.filter((x) => x.status === "REFUNDED").reduce((s, x) => s + centavos(n(x.valor)), 0);
  const custoC = cambio ? usdParaCentavos(n(consumo.custo_usd), cambio.taxa) : null;
  const anonimizado = p.nome === "Aluno anonimizado";

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5">
      <Link href="/admin/alunos" className="text-sm font-semibold text-violet-700 hover:underline">← Alunos</Link>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-950">{p.nome}</h1>
          <p className="text-sm text-slate-500">
            {texto(p.email)} · cadastro em {formatarData(String(p.criado_em))}
          </p>
          {p.suspenso_em && (
            <p className="mt-2 inline-block rounded-lg bg-red-50 px-3 py-1 text-sm font-semibold text-red-800">
              Suspenso em {formatarDataHora(p.suspenso_em)} — {texto(p.suspenso_motivo)}
            </p>
          )}
        </div>
        {podeSuspender && !anonimizado && (
          <a href={`/admin/alunos/${id}/exportar`} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50">
            Exportar dados (LGPD)
          </a>
        )}
      </div>

      {aviso.ok && <p role="status" className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-900">Feito e registrado na auditoria.</p>}
      {aviso.erro && <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">{aviso.erro}</p>}

      <div className="grid gap-5 lg:grid-cols-2">
        <Bloco titulo="Perfil">
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <Dado rotulo="Idioma" valor={`${NOME_DO_IDIOMA[p.idioma as keyof typeof NOME_DO_IDIOMA] ?? texto(p.idioma)} (${texto(p.sotaque)})`} />
            <Dado rotulo="Tutor" valor={texto(p.tutor)} />
            <Dado rotulo="Maior de idade" valor={p.maior_de_idade ? "Sim" : "Não"} />
            <Dado rotulo="Responsável" valor={texto(p.responsavel)} />
            <Dado rotulo="Último login" valor={p.ultimo_login ? formatarDataHora(String(p.ultimo_login)) : "—"} />
            <Dado rotulo="Última aula" valor={estudo.ultima ? formatarDataHora(String(estudo.ultima)) : "—"} />
          </dl>
        </Bloco>

        <Bloco titulo="Entrevista de boas-vindas">
          {entrevista?.concluida_em ? (
            <dl className="grid grid-cols-1 gap-3 text-sm">
              <Dado rotulo="Concluída em" valor={formatarData(String(entrevista.concluida_em))} />
              <Dado rotulo="Nível" valor={texto(entrevista.nivel)} />
              <Dado rotulo="Objetivos" valor={texto(entrevista.objetivos)} />
              <Dado rotulo="Temas de conversa" valor={texto(entrevista.temas)} />
              <Dado rotulo="Habilidades prioritárias" valor={texto(entrevista.habilidades)} />
              <Dado rotulo="Dificuldades" valor={texto(entrevista.dificuldades)} />
              <Dado rotulo="Disponibilidade" valor={texto(entrevista.disponibilidade)} />
              <Dado rotulo="Correção" valor={texto(entrevista.correcao)} />
            </dl>
          ) : (
            <p className="text-sm text-slate-500">Ainda não concluída.</p>
          )}
        </Bloco>

        <Bloco titulo="Estudo e metas">
          <dl className="grid grid-cols-3 gap-3 text-sm">
            <Dado rotulo="Sessões" valor={n(estudo.sessoes)} />
            <Dado rotulo="Tempo total" valor={formatarValor(n(estudo.segundos) / 3600, "horas")} />
            <Dado rotulo="Certificados" valor={n(d.certificados)} />
          </dl>
          {lista(d.metas).length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-1 text-xs">
              {lista(d.metas).map((m, i) => (
                <li key={i} className={`rounded px-2 py-0.5 ${n(m.cumpridos) >= n(m.necessarios) ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>
                  {String(m.mes).padStart(2, "0")}/{String(m.ano)} sem. {String(m.semana)}: {n(m.cumpridos)}/{n(m.necessarios)} dias
                </li>
              ))}
            </ul>
          )}
        </Bloco>

        <Bloco titulo="Consumo de IA" nota="Custos estimados pela tabela de preços do painel.">
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <Dado rotulo="Chamadas" valor={n(consumo.chamadas)} />
            <Dado rotulo="Com erro" valor={n(consumo.erros)} />
            <Dado rotulo="Tokens (entrada/saída)" valor={`${formatarValor(n(consumo.tokens_entrada), "numero")} / ${formatarValor(n(consumo.tokens_saida), "numero")}`} />
            <Dado rotulo="Voz sintetizada" valor={`${formatarValor(n(consumo.caracteres_voz), "numero")} caracteres`} />
            <Dado rotulo="Áudio transcrito" valor={formatarValor(n(consumo.segundos_transcritos) / 60, "minutos")} />
            {veDinheiro && <Dado rotulo="Custo total" valor={custoC === null ? formatarValor(n(consumo.custo_usd), "dolares") : formatarValor(reaisDe(custoC), "reais")} />}
          </dl>
        </Bloco>
      </div>

      {veDinheiro && (
        <Bloco titulo="Receita e margem deste aluno" nota="Receita confirmada (pagamentos + horas extras − reembolsos) menos o custo estimado de IA. Não inclui custos fixos.">
          <dl className="grid grid-cols-3 gap-3 text-sm">
            <Dado rotulo="Receita" valor={formatarValor(reaisDe(receitaC), "reais")} />
            <Dado rotulo="Custo de IA (estimado)" valor={custoC === null ? "—" : formatarValor(reaisDe(custoC), "reais")} />
            <Dado
              rotulo="Margem estimada"
              valor={custoC === null ? "—" : `${formatarValor(reaisDe(receitaC - custoC), "reais")}${receitaC > 0 ? ` (${formatarValor(((receitaC - custoC) / receitaC) * 100, "percentual")})` : ""}`}
            />
          </dl>
        </Bloco>
      )}

      <Bloco titulo="Assinaturas e pagamentos">
        {lista(d.assinaturas).length === 0 && pagamentos.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhuma assinatura ou pagamento.</p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            <ul className="space-y-2 text-sm">
              {lista(d.assinaturas).map((s) => (
                <li key={String(s.id)} className="rounded-lg bg-slate-50 p-3">
                  <strong>{s.plano ? nomeDeExibicao(String(s.plano)) : "—"}</strong> · {String(s.status)} · desde {formatarData(String(s.criada_em))}
                  <span className="block text-xs text-slate-500">
                    Horas do ciclo: {n(s.horas_utilizadas).toFixed(2).replace(".", ",")} de {n(s.horas_total).toFixed(2).replace(".", ",")}
                    {s.cancelamento_solicitado_em ? ` · cancelamento pedido em ${formatarData(String(s.cancelamento_solicitado_em))}, acesso até ${texto(s.acesso_ate)}` : ""}
                    {!s.asaas && s.status === "ativa" ? " · sem assinatura no Asaas" : ""}
                  </span>
                </li>
              ))}
            </ul>
            {veDinheiro && (
              <ul className="space-y-1 text-sm">
                {pagamentos.map((x) => (
                  <li key={String(x.id)} className="flex justify-between gap-3 border-b border-slate-100 py-1">
                    <span>{x.data_pagamento ? formatarData(String(x.data_pagamento)) : formatarData(String(x.criada_em))} · {String(x.status)}</span>
                    <span className="tabular-nums">
                      {formatarValor(n(x.valor), "reais")}
                      {x.valor_liquido !== null && x.valor_liquido !== undefined && <span className="text-xs text-slate-500"> (líq. {formatarValor(n(x.valor_liquido), "reais")})</span>}
                    </span>
                  </li>
                ))}
                {reembolsos.map((r) => (
                  <li key={String(r.protocolo)} className="flex justify-between gap-3 py-1 text-slate-600">
                    <span>Reembolso {String(r.protocolo)} · {String(r.status)}</span>
                    <span className="tabular-nums">−{formatarValor(n(r.valor), "reais")}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Bloco>

      <Bloco titulo="Extrato de horas" nota="Lançamentos válidos (a contagem antiga, de antes de 04/10/2026, foi invalidada). Aula conta só conversa ativa, por minuto.">
        {extrato.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhum lançamento.</p>
        ) : (
          <ul className="divide-y divide-slate-100 text-sm">
            {extrato.map((l) => (
              <li key={l.id} className="flex justify-between gap-3 py-1.5">
                <span>
                  {formatarDataHora(l.criada_em)} · <strong>{rotuloDoExtrato(l.tipo)}</strong> {l.descricao ? `— ${l.descricao}` : ""}
                  {l.motivo && <span className="block text-xs text-slate-500">{l.motivo}</span>}
                </span>
                <span className={`shrink-0 tabular-nums font-semibold ${l.segundos < 0 ? "text-red-700" : l.segundos > 0 ? "text-emerald-700" : "text-slate-400"}`}>{valorDoExtrato(l.segundos)}</span>
              </li>
            ))}
          </ul>
        )}
        {podeSuspender && !anonimizado && (
          <form action={agirNoAluno} className="mt-4 flex flex-col gap-2 rounded-xl border border-slate-200 p-4">
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="acao" value="conceder_horas" />
            <h3 className="font-bold">Conceder reposição</h3>
            <p className="text-xs text-slate-500">Soma horas ao ciclo atual (ex.: falha do sistema). Fica no extrato do aluno e na auditoria.</p>
            <label className="text-xs font-semibold text-slate-700">
              Horas (0,25 a 100)
              <input name="horas" required inputMode="decimal" pattern="[0-9]+([,.][0-9]{1,2})?" placeholder="1" className="mt-1 block w-32 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </label>
            <label htmlFor="motivo-horas" className="sr-only">Motivo</label>
            <textarea id="motivo-horas" name="motivo" required minLength={5} maxLength={500} rows={2} placeholder="Motivo (aparece para o aluno no extrato)" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" required className="mt-1" /> Confirmo esta reposição.
            </label>
            <button type="submit" className="w-fit rounded-lg bg-violet-700 px-4 py-2 text-sm font-bold text-white hover:bg-violet-800">Conceder</button>
          </form>
        )}
      </Bloco>

      <Bloco titulo="Conversas recentes" nota="Só dados técnicos. A leitura do conteúdo, com registro de acesso, chega na central de Conversas.">
        {lista(d.conversas).length === 0 ? (
          <p className="text-sm text-slate-500">Nenhuma conversa registrada (o registro começou em 29/09/2026).</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="py-2">Início</th>
                  <th className="py-2">Tutor</th>
                  <th className="py-2 text-right">Mensagens</th>
                  <th className="py-2 text-right">Erros</th>
                  {veDinheiro && <th className="py-2 text-right">Custo (US$)</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 tabular-nums">
                {lista(d.conversas).map((c) => (
                  <tr key={String(c.id)}>
                    <td className="py-2">{formatarDataHora(String(c.iniciada_em))}</td>
                    <td className="py-2">{texto(c.tutor)}</td>
                    <td className="py-2 text-right">{n(c.mensagens)}</td>
                    <td className="py-2 text-right">{n(c.erros)}</td>
                    {veDinheiro && <td className="py-2 text-right">{formatarValor(n(c.custo_usd), "dolares")}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Bloco>

      {!anonimizado && (podeSuspender || podeAnonimizar) && (
        <Bloco titulo="Ações sobre a conta" nota="Toda ação exige motivo e fica registrada na auditoria.">
          <div className="grid gap-4 lg:grid-cols-2">
            {podeSuspender && (
              <form action={agirNoAluno} className="flex flex-col gap-2 rounded-xl border border-slate-200 p-4">
                <input type="hidden" name="id" value={id} />
                <input type="hidden" name="acao" value={p.suspenso_em ? "reativar" : "suspender"} />
                <h3 className="font-bold">{p.suspenso_em ? "Reativar conta" : "Suspender conta"}</h3>
                <p className="text-xs text-slate-500">
                  {p.suspenso_em
                    ? "Libera o login de novo."
                    : "Bloqueia o login na hora. Não cancela a cobrança: se for o caso, cancele a renovação pelo Asaas ou peça ao aluno."}
                </p>
                <label htmlFor="motivo-susp" className="sr-only">Motivo</label>
                <textarea id="motivo-susp" name="motivo" required minLength={5} maxLength={500} rows={2} placeholder="Motivo" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                <label className="flex items-start gap-2 text-sm">
                  <input type="checkbox" required className="mt-1" /> Confirmo esta ação.
                </label>
                <button type="submit" className={`w-fit rounded-lg px-4 py-2 text-sm font-bold ${p.suspenso_em ? "bg-emerald-700 text-white" : "border border-red-300 text-red-700 hover:bg-red-50"}`}>
                  {p.suspenso_em ? "Reativar" : "Suspender"}
                </button>
              </form>
            )}
            {podeAnonimizar && (
              <form action={agirNoAluno} className="flex flex-col gap-2 rounded-xl border border-red-200 bg-red-50/40 p-4">
                <input type="hidden" name="id" value={id} />
                <input type="hidden" name="acao" value="anonimizar" />
                <h3 className="font-bold text-red-900">Anonimizar (pedido de exclusão — LGPD)</h3>
                <p className="text-xs text-red-900">
                  <strong>Irreversível.</strong> Apaga nome, e-mail, entrevista, memórias, depoimento e o texto das conversas, e bloqueia a conta.
                  Pagamentos, reembolsos e consumo ficam guardados sem identificação (obrigação legal). Exige renovação já cancelada.
                </p>
                <label htmlFor="motivo-anon" className="sr-only">Descrição do pedido</label>
                <textarea id="motivo-anon" name="motivo" required minLength={10} maxLength={1000} rows={2} placeholder="Pedido do titular: data e canal" className="rounded-lg border border-red-300 px-3 py-2 text-sm" />
                <label className="text-xs font-semibold text-red-900">
                  Digite ANONIMIZAR para confirmar
                  <input name="confirmacao" required autoComplete="off" className="mt-1 block w-full rounded-lg border border-red-300 px-3 py-2 text-sm" />
                </label>
                <button type="submit" className="w-fit rounded-lg bg-red-700 px-4 py-2 text-sm font-bold text-white hover:bg-red-800">Anonimizar</button>
              </form>
            )}
          </div>
        </Bloco>
      )}
    </div>
  );
}
