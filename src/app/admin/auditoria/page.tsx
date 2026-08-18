import { getAuditoriaLgpd } from "@/lib/data/admin";

// § 02, § 03: trilha de auditoria do consentimento — quando cada responsável
// consentiu, e com o quê.
export default async function AuditoriaLgpd() {
  const registros = await getAuditoriaLgpd();

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <span className="font-mono text-xs uppercase tracking-widest text-neutral-400">
          LGPD · Art. 14
        </span>
        <h1 className="mt-1 text-2xl font-bold">Auditoria</h1>
      </div>

      <div className="flex flex-col gap-3">
        {registros.map((registro) => (
          <div
            key={registro.id}
            className="rounded-lg border border-neutral-200 px-5 py-4 text-sm"
          >
            <p>
              <strong>{registro.responsavelNome}</strong> — {registro.acao}{" "}
              para <strong>{registro.alunoNome}</strong>
            </p>
            <p className="mt-1 text-xs text-neutral-400">
              {registro.dataHora}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
