import { getCuponsMock, getOrigemCadastrosMock } from "@/lib/mock/admin";

// § 12: de qual QR/escola/cupom veio cada aluno — sem nenhum trabalho manual
// de rastreio.
export default function OrigemDosCadastros() {
  const origens = getOrigemCadastrosMock();
  const cupons = getCuponsMock();

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <span className="font-mono text-xs uppercase tracking-widest text-neutral-400">
          Sem trabalho manual de rastreio
        </span>
        <h1 className="mt-1 text-2xl font-bold">Origem dos cadastros</h1>
      </div>

      <div className="overflow-x-auto rounded-lg border border-neutral-200">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-xs uppercase tracking-widest text-neutral-400">
            <tr>
              <th className="px-4 py-3 font-medium">Aluno</th>
              <th className="px-4 py-3 font-medium">Escola de origem</th>
              <th className="px-4 py-3 font-medium">Cupom</th>
              <th className="px-4 py-3 font-medium">Cadastrado em</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {origens.map((origem) => {
              const cupom = cupons.find((c) => c.id === origem.cupomUsado);
              return (
                <tr key={origem.id}>
                  <td className="px-4 py-3 font-medium">{origem.alunoNome}</td>
                  <td className="px-4 py-3">{origem.escolaOrigem}</td>
                  <td className="px-4 py-3 text-neutral-500">
                    {cupom ? `${cupom.descontoPercentual}% off` : "—"}
                  </td>
                  <td className="px-4 py-3 text-neutral-500">
                    {origem.cadastradoEm}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
