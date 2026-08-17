import { CardCertificadoDoMes } from "@/components/aluno/CardCertificadoDoMes";
import { MapaDoMes } from "@/components/aluno/MapaDoMes";
import { getProgressoDoMesMock } from "@/lib/mock/progresso";
import { NOME_DO_PLANO, elegivelParaCertificado } from "@/lib/types";

// Ainda usa dado fixo (src/lib/mock/progresso.ts) — sem banco por trás. O formato
// do dado já é o que a tabela real vai precisar ter (docs/ESCOPO.md § 05).
export default function ProgressoDoMes() {
  const progresso = getProgressoDoMesMock();
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
