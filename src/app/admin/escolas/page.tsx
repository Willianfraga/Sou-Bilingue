import { StatusChip } from "@/components/admin/StatusChip";
import { getParceriasEscolas } from "@/lib/data/admin";

// § 08, § 10: prospecção de parceria pra o certificado valer nota extra ou
// crédito extracurricular — começa já na Fase 1, em paralelo. Comissão de
// afiliado é ideia em aberto, ainda não decidida (ver CLAUDE.md).
export default async function ParceriasComEscolas() {
  const parcerias = await getParceriasEscolas();

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <span className="font-mono text-xs uppercase tracking-widest text-neutral-400">
          Prospecção
        </span>
        <h1 className="mt-1 text-2xl font-bold">Parcerias com escolas</h1>
      </div>

      <div className="rounded-lg border border-neutral-200 px-5">
        {parcerias.map((parceria) => (
          <div
            key={parceria.id}
            className="flex items-center justify-between border-b border-neutral-100 py-4 last:border-b-0"
          >
            <span className="font-semibold">{parceria.nomeEscola}</span>
            <StatusChip status={parceria.status} />
          </div>
        ))}
      </div>
    </div>
  );
}
