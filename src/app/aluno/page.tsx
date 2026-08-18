import { CardCertificadoDoMes } from "@/components/aluno/CardCertificadoDoMes";
import { MapaDoMes } from "@/components/aluno/MapaDoMes";
import { requireSessao } from "@/lib/auth/guards";
import { getProgressoDoMes } from "@/lib/data/progresso";
import { NOME_DO_PLANO, elegivelParaCertificado } from "@/lib/types";

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
    <div className="flex max-w-2xl flex-col gap-6">
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
