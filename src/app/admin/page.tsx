import { StatusChip } from "@/components/admin/StatusChip";
import { getAssinaturas } from "@/lib/data/admin";
import { NOME_DO_PLANO } from "@/lib/types";

// § 03, § 07: painel de assinaturas é só visão — cobrança processada pelo
// Asaas, nada aqui opera na mão. Dado real; assinaturas ainda não têm
// gateway ligado (ver seed em scripts/seed-admin-teste.mjs).
export default async function Assinaturas() {
  const assinaturas = await getAssinaturas();

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <span className="font-mono text-xs uppercase tracking-widest text-neutral-400">
          Cobrança via Asaas · só acompanhamento
        </span>
        <h1 className="mt-1 text-2xl font-bold">Assinaturas</h1>
      </div>

      <div className="overflow-x-auto rounded-lg border border-neutral-200">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-xs uppercase tracking-widest text-neutral-400">
            <tr>
              <th className="px-4 py-3 font-medium">Aluno</th>
              <th className="px-4 py-3 font-medium">Plano</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Próxima cobrança</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {assinaturas.map((assinatura) => (
              <tr key={assinatura.id}>
                <td className="px-4 py-3 font-medium">{assinatura.alunoNome}</td>
                <td className="px-4 py-3">{NOME_DO_PLANO[assinatura.plano]}</td>
                <td className="px-4 py-3">
                  <StatusChip status={assinatura.status} />
                </td>
                <td className="px-4 py-3 text-neutral-500">
                  {assinatura.proximaCobranca}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
