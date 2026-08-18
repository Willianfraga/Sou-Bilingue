import { CardCertificadoDoMes } from "@/components/aluno/CardCertificadoDoMes";
import { MapaDoMes } from "@/components/aluno/MapaDoMes";
import { requireSessao } from "@/lib/auth/guards";
import { getAlunoDoResponsavel } from "@/lib/data/alunos";
import { getProgressoDoMes } from "@/lib/data/progresso";
import { NOME_DO_PLANO, elegivelParaCertificado } from "@/lib/types";

// Dado real — mesma função de progresso da interface do aluno (§ 03: o
// responsável acompanha o mesmo progresso), só filtrando pelo aluno vinculado.
export default async function ProgressoDoAluno() {
  const sessao = await requireSessao();
  const aluno = await getAlunoDoResponsavel(sessao.userId);

  if (!aluno) {
    return (
      <p className="text-neutral-500">Nenhum aluno vinculado a esta conta.</p>
    );
  }

  const progresso = await getProgressoDoMes(aluno.id);
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
          {aluno.nome} · {progresso.mesReferencia} · plano{" "}
          {NOME_DO_PLANO[progresso.plano]}
        </span>
        <h1 className="mt-1 text-2xl font-bold">Progresso do aluno</h1>
      </div>

      <MapaDoMes semanas={progresso.semanas} />

      <CardCertificadoDoMes elegivel={elegivel} />

      <p className="text-sm text-neutral-500">
        Esse resumo também chega automaticamente por mensagem toda semana —
        você não precisa abrir o app pra acompanhar.
      </p>
    </div>
  );
}
