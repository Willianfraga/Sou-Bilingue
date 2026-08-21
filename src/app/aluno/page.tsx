import { CardCertificadoDoMes } from "@/components/aluno/CardCertificadoDoMes";
import { MapaDoMes } from "@/components/aluno/MapaDoMes";
import { requireSessao } from "@/lib/auth/guards";
import { getProgressoDoMes } from "@/lib/data/progresso";
import { NOME_DO_PLANO, elegivelParaCertificado } from "@/lib/types";
import Link from "next/link";

// Dado real — src/lib/data/progresso.ts consulta cotas_semanais com o
// cliente de sessão (RLS ativo). O formato já era o mesmo do mock, então a
// troca foi só na origem do dado, não na tela (docs/ESCOPO.md § 05).
export default async function ProgressoDoMes() {
  const sessao = await requireSessao();
  const progresso = await getProgressoDoMes(sessao.userId);

  if (!progresso) {
    return (
      <p className="text-neutral-500">
        Ainda não há progresso registrado pra este mês.
      </p>
    );
  }

  const elegivel = elegivelParaCertificado(progresso);

  return (
    <div className="flex max-w-2xl flex-col gap-6 md:gap-8">
      <section className="order-first overflow-hidden rounded-[2rem] bg-gradient-to-br from-indigo-600 via-indigo-500 to-violet-500 p-6 text-white shadow-xl shadow-indigo-200 md:hidden">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-100">
          Sua jornada de hoje
        </p>
        <h2 className="mt-3 max-w-[14ch] text-3xl font-bold leading-tight">
          Um passo de cada vez, rumo à fluência.
        </h2>
        <p className="mt-3 text-sm leading-6 text-indigo-100">
          Pratique hoje para manter o seu ritmo e avançar na trilha do mês.
        </p>
        <Link
          href="/aluno/aula"
          className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-white px-5 py-4 text-sm font-bold text-indigo-700 shadow-sm transition hover:bg-indigo-50"
        >
          Começar prática de hoje
        </Link>
      </section>
      <div>
        <span className="font-mono text-xs uppercase tracking-widest text-neutral-400">
          {progresso.mesReferencia} · plano {NOME_DO_PLANO[progresso.plano]}
        </span>
        <h1 className="mt-1 text-2xl font-bold">Progresso do mês</h1>
      </div>

      <MapaDoMes semanas={progresso.semanas} />

      <CardCertificadoDoMes elegivel={elegivel} />
    </div>
  );
}
