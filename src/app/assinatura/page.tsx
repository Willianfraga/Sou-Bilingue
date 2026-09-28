import Link from "next/link";
import { requirePapel } from "@/lib/auth/guards";
import { formatarPreco, nomeDeExibicao } from "@/lib/billing/planos";
import { MOTIVOS_DE_CANCELAMENTO, formatarData } from "@/lib/billing/regras-cancelamento";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cancelarMinhaAssinatura } from "./actions";

export const dynamic = "force-dynamic";

const ERROS: Record<string, string> = {
  confirmacao: "Marque a confirmação para cancelar.",
  tentativas: "Muitas tentativas seguidas. Aguarde alguns minutos.",
  falha: "Não foi possível cancelar agora. Tente de novo em instantes ou fale com o suporte.",
};

// Minha assinatura: ver o plano e cancelar sem falar com ninguém. Fica fora
// de /aluno de propósito: lá tudo exige a entrevista concluída, e o aluno tem
// de conseguir cancelar a qualquer momento.
export default async function MinhaAssinatura({
  searchParams,
}: {
  searchParams: Promise<{ cancelada?: string; erro?: string }>;
}) {
  const sessao = await requirePapel("aluno");
  const aviso = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("status, horas_restantes, cancelamento_solicitado_em, acesso_ate, planos(nome, preco)")
    .eq("aluno_id", sessao.userId)
    .in("status", ["ativa", "pendente"])
    .order("criada_em", { ascending: false })
    .limit(1)
    .maybeSingle();

  const plano = sub ? (Array.isArray(sub.planos) ? sub.planos[0] : sub.planos) : null;
  const cancelada = Boolean(sub?.cancelamento_solicitado_em);

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-6 px-5 py-10">
      <Link href="/aluno" className="text-sm font-semibold text-violet-700 hover:underline">← Voltar ao app</Link>
      <div>
        <span className="font-mono text-xs uppercase tracking-widest text-neutral-400">Minha conta</span>
        <h1 className="mt-1 text-2xl font-bold">Minha assinatura</h1>
      </div>

      {aviso.cancelada && (
        <p role="status" className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          Assinatura cancelada. Nenhuma nova cobrança será feita.
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
                ? `Cancelada. Você continua com acesso até ${sub.acesso_ate ? formatarData(sub.acesso_ate) : "o fim do período pago"}; nenhuma nova cobrança será feita.`
                : `Ativa · ${Number(sub.horas_restantes ?? 0).toFixed(1)} h restantes neste ciclo. Renovação mensal automática.`}
          </p>
        </div>
      )}

      {sub && !cancelada && (
        <form action={cancelarMinhaAssinatura} className="flex flex-col gap-4 rounded-lg border border-neutral-200 p-5">
          <h2 className="font-bold">Cancelar assinatura</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm text-neutral-600">
            <li>As próximas cobranças são canceladas na hora.</li>
            <li>
              {sub.status === "pendente"
                ? "A cobrança ainda não paga é removida."
                : "Você continua com acesso até o fim do período que já pagou."}
            </li>
            <li>Seu histórico, perfil e certificados continuam guardados. Para voltar, é só assinar de novo.</li>
          </ul>
          <div>
            <label htmlFor="motivo" className="text-sm font-semibold">Pode contar o motivo? (opcional)</label>
            <select id="motivo" name="motivo" defaultValue="" className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm">
              <option value="">Prefiro não dizer</option>
              {MOTIVOS_DE_CANCELAMENTO.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" name="confirmo" value="sim" required className="mt-1" />
            Quero cancelar minha assinatura.
          </label>
          <button
            type="submit"
            className="w-fit rounded-md border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-red-200"
          >
            Cancelar assinatura
          </button>
        </form>
      )}
    </main>
  );
}
