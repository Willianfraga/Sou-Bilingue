import { getCupons } from "@/lib/data/admin";

// § 12: cupom por escola, válido só na primeira mensalidade — o link do QR
// já carrega o código embutido, ninguém digita nada.
export default async function CuponsEQrCodes() {
  const cupons = await getCupons();

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="font-mono text-xs uppercase tracking-widest text-neutral-400">
            Válido só na 1ª mensalidade
          </span>
          <h1 className="mt-1 text-2xl font-bold">Cupons e QR Codes</h1>
        </div>
        <button
          type="button"
          disabled
          title="Geração de QR Code ainda não implementada"
          className="shrink-0 cursor-not-allowed rounded-md border border-neutral-200 px-4 py-2 text-sm text-neutral-400"
        >
          Novo cupom + QR
        </button>
      </div>

      <div className="rounded-lg border border-neutral-200 px-5">
        {cupons.map((cupom) => (
          <div
            key={cupom.id}
            className="flex items-center justify-between border-b border-neutral-100 py-4 last:border-b-0"
          >
            <div>
              <p className="font-semibold">{cupom.nomeEscola}</p>
              <p className="text-xs text-neutral-400">
                {cupom.usos} cadastro{cupom.usos === 1 ? "" : "s"} usando esse
                cupom
              </p>
            </div>
            <span className="font-mono text-sm text-teal-700">
              {cupom.descontoPercentual}% off
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
