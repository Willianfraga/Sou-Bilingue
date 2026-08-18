import { getRegrasDeCertificacaoMock } from "@/lib/mock/admin";
import { NOME_DO_PLANO } from "@/lib/types";

// § 04, § 05: nota mínima decide se a aula conta como cumprida — sempre
// automática, nenhum plano tem revisão humana (inclusive o Avançado).
export default function MotorDeCertificacao() {
  const regras = getRegrasDeCertificacaoMock();

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <div>
        <span className="font-mono text-xs uppercase tracking-widest text-neutral-400">
          Sempre automático · sem revisão humana
        </span>
        <h1 className="mt-1 text-2xl font-bold">Motor de certificação</h1>
      </div>

      <div className="rounded-lg border border-neutral-200 px-5">
        {regras.map((regra) => (
          <div
            key={regra.plano}
            className="flex items-center justify-between border-b border-neutral-100 py-4 last:border-b-0"
          >
            <span className="font-semibold">{NOME_DO_PLANO[regra.plano]}</span>
            <span className="text-sm text-neutral-600">
              nota mínima {regra.notaMinima}
            </span>
          </div>
        ))}
      </div>

      <button
        type="button"
        disabled
        title="Edição ainda não implementada"
        className="w-fit cursor-not-allowed rounded-md border border-neutral-200 px-4 py-2 text-sm text-neutral-400"
      >
        Editar regra
      </button>
    </div>
  );
}
