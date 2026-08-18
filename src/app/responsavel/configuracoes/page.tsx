import { getLimitesDeUsoMock } from "@/lib/mock/responsavel";

export default function LimitesDeUso() {
  const limites = getLimitesDeUsoMock();

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <div>
        <span className="font-mono text-xs uppercase tracking-widest text-neutral-400">
          Configurações
        </span>
        <h1 className="mt-1 text-2xl font-bold">Limites de uso</h1>
      </div>

      <div className="rounded-lg border border-neutral-200 px-5">
        <div className="flex items-center justify-between border-b border-neutral-100 py-4">
          <span className="font-mono text-xs uppercase tracking-widest text-neutral-400">
            Janela permitida
          </span>
          <span className="font-semibold">{limites.janelaPermitida}</span>
        </div>
        <div className="flex items-center justify-between py-4">
          <span className="font-mono text-xs uppercase tracking-widest text-neutral-400">
            Alerta de comportamento fora do padrão
          </span>
          <span className="font-semibold">
            {limites.alertaComportamentoForaDoPadrao ? "Ativo" : "Desligado"}
          </span>
        </div>
      </div>

      <button
        type="button"
        disabled
        title="Edição ainda não implementada"
        className="w-fit cursor-not-allowed rounded-md border border-neutral-200 px-4 py-2 text-sm text-neutral-400"
      >
        Editar limites
      </button>
    </div>
  );
}
