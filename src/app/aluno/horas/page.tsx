import Link from "next/link";
import { requirePapel } from "@/lib/auth/guards";
import { getActiveSubscription } from "@/lib/billing/subscription";

export const dynamic = "force-dynamic";

// Minhas horas (menu bento): saldo de horas de conversa do ciclo. Saiu da
// tela da aula, que agora mostra só o relógio da sessão.
export default async function MinhasHoras() {
  const sessao = await requirePapel("aluno");
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

  const total = Number(assinatura.horas_total) || 0;
  const restantes = Math.max(0, Number(assinatura.horas_restantes) || 0);
  const usadas = Math.max(0, total - restantes);
  const percentual = total ? Math.min(100, Math.round((usadas / total) * 100)) : 0;
  const fmt = (h: number) => `${h.toFixed(1).replace(".", ",").replace(",0", "")} h`;

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-[#536ec8]">Minha conta</p>
        <h1 className="mt-1 text-2xl font-black text-slate-950">Minhas horas</h1>
      </div>

      <section className="rounded-3xl bg-gradient-to-br from-[#2c3e60] via-[#536ec8] to-[#6f85d9] p-6 text-white shadow-xl">
        <p className="text-sm font-semibold text-white/80">Horas de conversa restantes neste ciclo</p>
        <p className="mt-1 text-5xl font-black tabular-nums">{fmt(restantes)}</p>
        <p className="mt-1 text-sm text-white/80">de {fmt(total)} do seu plano</p>
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
        O tempo de cada aula aparece no relógio, no topo da tela da aula. O saldo renova a cada ciclo mensal da assinatura.
      </p>
      <Link href="/aluno/aula" className="w-fit rounded-2xl bg-[#536ec8] px-5 py-3 font-bold text-white hover:bg-[#465fb5]">Ir para a aula</Link>
    </div>
  );
}
