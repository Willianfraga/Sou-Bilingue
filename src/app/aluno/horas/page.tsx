import Link from "next/link";
import { comprarHorasExtrasAction } from "@/app/aluno/topups/actions";
import { requirePapel } from "@/lib/auth/guards";
import { extratoDeHoras } from "@/lib/billing/extrato";
import { PACOTES_DE_HORAS_EXTRAS, formatarHoras, formatarReais, precoDoPacote, rotuloDoExtrato, valorDoExtrato } from "@/lib/billing/horas";
import { getActiveSubscription } from "@/lib/billing/subscription";
import { precoDaHoraExtra } from "@/lib/billing/topups";

export const dynamic = "force-dynamic";

const data = (iso: string) => new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

// Minhas horas (menu bento): saldo do ciclo, compra de horas extras e
// extrato. Aula conta só o tempo de conversa ativa, por minuto.
export default async function MinhasHoras({ searchParams }: { searchParams: Promise<{ compra?: string; erro?: string }> }) {
  const sessao = await requirePapel("aluno");
  const aviso = await searchParams;
  const assinatura = await getActiveSubscription(sessao.userId);

  if (!assinatura) {
    return (
      <section className="mx-auto max-w-xl rounded-3xl border border-amber-200 bg-amber-50 p-8 text-center">
        <h1 className="text-xl font-bold text-amber-950">Você ainda não tem horas ativas</h1>
        <p className="mt-2 text-sm text-amber-800">Escolha um plano para começar a conversar.</p>
        <a href="/checkout" className="mt-5 inline-flex rounded-full bg-amber-900 px-5 py-3 font-semibold text-white">Ver planos</a>
      </section>
    );
  }

  const [extrato, precoPorHora] = await Promise.all([extratoDeHoras(sessao.userId, 30), precoDaHoraExtra()]);
  const total = Number(assinatura.horas_total) || 0;
  const restantes = Math.max(0, Number(assinatura.horas_restantes) || 0);
  const usadas = Math.max(0, total - restantes);
  const percentual = total ? Math.min(100, Math.round((usadas / total) * 100)) : 0;
  const renova = assinatura.ciclo_fim ? new Date(`${assinatura.ciclo_fim}T12:00:00`).toLocaleDateString("pt-BR") : null;

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-[#536ec8]">Minha conta</p>
        <h1 className="mt-1 text-2xl font-black text-slate-950">Minhas horas</h1>
      </div>

      {aviso.compra === "ok" && (
        <p role="status" className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          Recebemos seu pedido. As horas entram no saldo assim que o pagamento for confirmado (Pix e cartão costumam levar poucos minutos).
        </p>
      )}
      {aviso.erro && <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">{aviso.erro}</p>}

      <section className="rounded-3xl bg-gradient-to-br from-[#2c3e60] via-[#536ec8] to-[#6f85d9] p-6 text-white shadow-xl">
        <p className="text-sm font-semibold text-white/80">Horas de conversa restantes</p>
        <p className="mt-1 text-5xl font-black tabular-nums">{formatarHoras(restantes)}</p>
        <p className="mt-1 text-sm text-white/80">de {formatarHoras(total)} neste ciclo{renova ? ` · renova em ${renova}` : ""}</p>
        <div className="mt-5">
          <div className="flex justify-between text-xs font-semibold text-white/80">
            <span>Usado no ciclo</span>
            <span>{percentual}%</span>
          </div>
          <div className="mt-1 h-2.5 w-full rounded-full bg-white/25" role="progressbar" aria-valuenow={percentual} aria-valuemin={0} aria-valuemax={100} aria-label="Horas usadas no ciclo">
            <div className="h-2.5 rounded-full bg-white" style={{ width: `${percentual}%` }} />
          </div>
        </div>
      </section>

      <p className="text-sm text-slate-600">
        Conta só o tempo de conversa com a tutora, arredondado por minuto. Pausas não contam. Se a tutora falhar e a aula não acontecer, ela não é cobrada.
      </p>

      <section className="rounded-3xl border border-slate-200 bg-white p-5">
        <h2 className="font-black text-slate-900">Horas extras</h2>
        <p className="mt-1 text-sm text-slate-600">
          {formatarReais(precoPorHora)} por hora, pagamento único. Entram no saldo depois da confirmação do pagamento e, se sobrarem, passam para o próximo ciclo.
        </p>
        <div className="mt-4 grid grid-cols-3 gap-3">
          {PACOTES_DE_HORAS_EXTRAS.map((horas) => (
            <form key={horas} action={comprarHorasExtrasAction}>
              <input type="hidden" name="horas" value={horas} />
              <button type="submit" className="flex w-full flex-col items-center rounded-2xl border-2 border-[#dfe4fa] px-2 py-4 transition hover:border-[#536ec8] hover:bg-[#f5f7ff]">
                <span className="text-2xl font-black text-[#3a4f9e]">{horas} h</span>
                <span className="mt-1 text-sm font-semibold text-slate-700">{formatarReais(precoDoPacote(horas, precoPorHora))}</span>
              </button>
            </form>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5">
        <h2 className="font-black text-slate-900">Extrato</h2>
        {extrato.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">Ainda não há lançamentos. Suas aulas aparecem aqui.</p>
        ) : (
          <ul className="mt-2 divide-y divide-slate-100 text-sm">
            {extrato.map((l) => (
              <li key={l.id} className="flex justify-between gap-3 py-2">
                <span>
                  <strong className="text-slate-900">{rotuloDoExtrato(l.tipo)}</strong>
                  <span className="text-slate-500"> · {data(l.criada_em)}</span>
                  {(l.motivo || (l.tipo !== "uso" && l.descricao)) && <span className="block text-xs text-slate-500">{l.motivo ?? l.descricao}</span>}
                </span>
                <span className={`shrink-0 tabular-nums font-bold ${l.segundos < 0 ? "text-slate-900" : l.segundos > 0 ? "text-emerald-700" : "text-slate-400"}`}>{valorDoExtrato(l.segundos)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Link href="/aluno/aula" className="w-fit rounded-2xl bg-[#536ec8] px-5 py-3 font-bold text-white hover:bg-[#465fb5]">Ir para a aula</Link>
    </div>
  );
}
