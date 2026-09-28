import Link from "next/link";
import { requirePapel } from "@/lib/auth/guards";
import { formatarPreco, nomeDeExibicao } from "@/lib/billing/planos";
import { getSituacaoReembolso } from "@/lib/billing/reembolso";
import { MOTIVOS_DE_CANCELAMENTO, formatarData } from "@/lib/billing/regras-cancelamento";
import { MOTIVOS_DE_REEMBOLSO, ROTULO_STATUS, formatarDataHoraBrasilia } from "@/lib/billing/regras-reembolso";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cancelarMinhaAssinatura, pedirReembolso } from "./actions";

export const dynamic = "force-dynamic";

const ERROS: Record<string, string> = {
  confirmacao: "Marque a confirmação para cancelar.",
  confirmacao_reembolso: "Marque a confirmação para enviar o pedido de reembolso.",
  tentativas: "Muitas tentativas seguidas. Aguarde alguns minutos.",
  falha: "Não foi possível cancelar agora. Tente de novo em instantes ou fale com o suporte.",
  senha: "Senha incorreta. Confirme sua senha para pedir o reembolso.",
  motivo: "Depois do prazo de 7 dias, escolha o motivo para registrarmos sua solicitação.",
  falha_reembolso: "Não foi possível registrar o pedido agora. Tente de novo em instantes ou fale com o suporte.",
};

const campo = "mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm";

// Minha assinatura: ver o plano, cancelar a renovação e pedir reembolso sem
// falar com ninguém. Fica fora de /aluno de propósito: lá tudo exige a
// entrevista concluída, e o aluno tem de conseguir cancelar a qualquer momento.
// Política: docs/refund-policy.md.
export default async function MinhaAssinatura({
  searchParams,
}: {
  searchParams: Promise<{ cancelada?: string; erro?: string; protocolo?: string }>;
}) {
  const sessao = await requirePapel("aluno");
  const aviso = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("status, horas_restantes, proxima_renovacao, cancelamento_solicitado_em, acesso_ate, planos(nome, preco)")
    .eq("aluno_id", sessao.userId)
    .in("status", ["ativa", "pendente"])
    .order("criada_em", { ascending: false })
    .limit(1)
    .maybeSingle();
  const situacao = await getSituacaoReembolso(sessao.userId);

  const plano = sub ? (Array.isArray(sub.planos) ? sub.planos[0] : sub.planos) : null;
  const cancelada = Boolean(sub?.cancelamento_solicitado_em);
  const pag = situacao.pagamento;
  const pedidoDoPagamento = pag ? situacao.pedidos.find((p) => p.asaas_payment_id === pag.asaas_payment_id) : undefined;
  const podePedirReembolso = Boolean(pag && !pedidoDoPagamento && situacao.prazoFinal);
  const prazoTexto = situacao.prazoFinal ? formatarDataHoraBrasilia(situacao.prazoFinal) : null;

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-6 px-5 py-10">
      <Link href="/aluno" className="text-sm font-semibold text-violet-700 hover:underline">← Voltar ao app</Link>
      <div>
        <span className="font-mono text-xs uppercase tracking-widest text-neutral-400">Minha conta</span>
        <h1 className="mt-1 text-2xl font-bold">Minha assinatura</h1>
      </div>

      {aviso.cancelada && (
        <p role="status" className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          Renovação cancelada. Nenhuma nova cobrança será feita.
        </p>
      )}
      {aviso.protocolo && (
        <p role="status" className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          Pedido de reembolso recebido. Protocolo <strong className="font-mono">{aviso.protocolo}</strong>. Guarde este número — o
          andamento aparece aqui embaixo.
        </p>
      )}
      {aviso.erro && ERROS[aviso.erro] && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">{ERROS[aviso.erro]}</p>
      )}

      {!sub ? (
        <div className="rounded-lg border border-neutral-200 p-5">
          <p className="text-neutral-600">Você não tem uma assinatura ativa.</p>
          <a href="/checkout" className="mt-3 inline-block font-semibold text-violet-700 hover:underline">Ver planos</a>
        </div>
      ) : (
        <div className="rounded-lg border border-neutral-200 p-5">
          <p className="text-sm text-neutral-500">Plano</p>
          <p className="text-lg font-bold">
            {plano ? nomeDeExibicao(plano.nome) : "—"}
            {plano && <span className="ml-2 text-sm font-normal text-neutral-500">{formatarPreco(Number(plano.preco))}/mês</span>}
          </p>
          <p className="mt-3 text-sm text-neutral-600">
            {sub.status === "pendente"
              ? "Aguardando a confirmação do primeiro pagamento."
              : cancelada
                ? `Renovação cancelada. Você continua com acesso até ${sub.acesso_ate ? formatarData(sub.acesso_ate) : "o fim do período pago"}; nenhuma nova cobrança será feita.`
                : `Ativa · ${Number(sub.horas_restantes ?? 0).toFixed(1)} h restantes neste ciclo. Renovação mensal automática.`}
          </p>
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-neutral-500">Data da compra</dt>
            <dd>{pag ? formatarData(pag.data_pagamento) : "—"}</dd>
            <dt className="text-neutral-500">Próxima cobrança</dt>
            <dd>{cancelada || sub.status !== "ativa" ? "Nenhuma" : sub.proxima_renovacao ? formatarData(sub.proxima_renovacao) : "Em um mês após a compra"}</dd>
            <dt className="text-neutral-500">Fim do prazo de 7 dias</dt>
            <dd>{prazoTexto ?? "—"}</dd>
            <dt className="text-neutral-500">Situação do prazo</dt>
            <dd>{!pag ? "—" : situacao.dentro ? <span className="font-semibold text-emerald-700">Dentro do prazo</span> : "Prazo encerrado"}</dd>
          </dl>
        </div>
      )}

      {situacao.pedidos.length > 0 && (
        <section className="rounded-lg border border-neutral-200 p-5">
          <h2 className="font-bold">Meus pedidos de reembolso</h2>
          <ul className="mt-3 space-y-3 text-sm">
            {situacao.pedidos.map((p) => (
              <li key={p.id} className="rounded-md bg-neutral-50 px-3 py-2">
                <p className="font-mono text-xs text-neutral-500">{p.protocolo}</p>
                <p>
                  <strong>{ROTULO_STATUS[p.status]}</strong> · {formatarPreco(Number(p.valor))} · pedido em{" "}
                  {formatarDataHoraBrasilia(new Date(p.solicitado_em))}
                </p>
                {p.status === "PROCESSING" && (
                  <p className="text-neutral-600">O estorno foi enviado ao provedor de pagamento. O prazo para o valor aparecer depende do meio de pagamento e do seu banco.</p>
                )}
                {p.status === "UNDER_REVIEW" && <p className="text-neutral-600">Nossa equipe vai analisar e responder pelo e-mail da sua conta.</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {sub && !cancelada && (
        <form action={cancelarMinhaAssinatura} className="flex flex-col gap-4 rounded-lg border border-neutral-200 p-5">
          <h2 className="font-bold">Cancelar renovação</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm text-neutral-600">
            <li>As próximas cobranças são canceladas na hora.</li>
            <li>
              {sub.status === "pendente"
                ? "A cobrança ainda não paga é removida."
                : "Você continua com acesso até o fim do período que já pagou."}
            </li>
            <li>Cancelar a renovação não devolve o que já foi pago — para isso, use “Solicitar reembolso”.</li>
            <li>Seu histórico, perfil e certificados continuam guardados. Para voltar, é só assinar de novo.</li>
          </ul>
          <div>
            <label htmlFor="motivo" className="text-sm font-semibold">Pode contar o motivo? (opcional)</label>
            <select id="motivo" name="motivo" defaultValue="" className={campo}>
              <option value="">Prefiro não dizer</option>
              {MOTIVOS_DE_CANCELAMENTO.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" name="confirmo" value="sim" required className="mt-1" />
            Entendi: as próximas cobranças param e o acesso segue até o fim do período pago.
          </label>
          <button
            type="submit"
            className="w-fit rounded-md border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-red-200"
          >
            Cancelar renovação
          </button>
        </form>
      )}

      {podePedirReembolso && pag && (
        <form action={pedirReembolso} className="flex flex-col gap-4 rounded-lg border border-neutral-200 p-5">
          <h2 className="font-bold">Solicitar reembolso</h2>
          {situacao.dentro ? (
            <>
              <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                Você está dentro do prazo de sete dias. Pode cancelar e solicitar o reembolso integral sem precisar informar um motivo.
              </p>
              <ul className="list-disc space-y-1 pl-5 text-sm text-neutral-600">
                <li>
                  Valor do reembolso: <strong>{formatarPreco(pag.valor)}</strong> (integral), devolvido pelo mesmo meio de pagamento.
                </li>
                <li>A renovação é cancelada junto.</li>
                <li>O acesso termina quando o estorno for confirmado pelo provedor de pagamento.</li>
              </ul>
            </>
          ) : (
            <>
              <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
                O prazo de sete dias para reembolso por arrependimento terminou{prazoTexto ? ` em ${prazoTexto}` : ""}. Você ainda pode
                cancelar as próximas renovações. Não haverá reembolso automático do período atual, mas situações como cobrança indevida,
                duplicidade ou falha na prestação podem ser enviadas para análise.
              </p>
              <p className="text-sm text-neutral-600">
                Valor do pagamento: {formatarPreco(pag.valor)}. O pedido vai para análise da equipe; você acompanha aqui pelo protocolo.
              </p>
            </>
          )}
          <div>
            <label htmlFor="motivo-reembolso" className="text-sm font-semibold">
              Motivo {situacao.dentro ? "(opcional)" : "(obrigatório)"}
            </label>
            <select id="motivo-reembolso" name="motivo" defaultValue="" required={!situacao.dentro} className={campo}>
              <option value="">{situacao.dentro ? "Prefiro não dizer" : "Escolha o motivo"}</option>
              {MOTIVOS_DE_REEMBOLSO.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="comentario" className="text-sm font-semibold">Comentário (opcional)</label>
            <textarea id="comentario" name="comentario" maxLength={1000} rows={3} className={campo} />
          </div>
          {situacao.dentro && (
            <div>
              <label htmlFor="senha" className="text-sm font-semibold">Confirme sua senha</label>
              <input id="senha" name="senha" type="password" autoComplete="current-password" required className={campo} />
            </div>
          )}
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" name="confirmo" value="sim" required className="mt-1" />
            {situacao.dentro
              ? "Entendi: minha assinatura será cancelada e o valor integral será estornado."
              : "Entendi: o pedido será analisado e não há reembolso automático."}
          </label>
          <button
            type="submit"
            className="w-fit rounded-md bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-neutral-300"
          >
            {situacao.dentro ? "Solicitar reembolso" : "Enviar para análise"}
          </button>
        </form>
      )}

      <p className="text-xs text-neutral-500">
        Política completa de cancelamento e reembolso nos{" "}
        <Link href="/termos#cancelamento" className="underline">Termos de uso</Link>.
      </p>
    </main>
  );
}
