import { CardCertificadoDoMes } from "@/components/aluno/CardCertificadoDoMes";
import { MapaDoMes } from "@/components/aluno/MapaDoMes";
import { getProgressoDoMesMock } from "@/lib/mock/progresso";
import { NOME_DO_PLANO, elegivelParaCertificado } from "@/lib/types";

// Mesmo componente/tipo da interface do aluno (§ 03: o responsável acompanha
// o mesmo progresso, só numa interface separada) — dado mock, sem banco.
export default function ProgressoDoAluno() {
  const progresso = getProgressoDoMesMock();
  const elegivel = elegivelParaCertificado(progresso);

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <span className="font-mono text-xs uppercase tracking-widest text-neutral-400">
          {progresso.mesReferencia} · plano {NOME_DO_PLANO[progresso.plano]}
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
