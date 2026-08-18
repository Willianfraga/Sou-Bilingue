import { CardCertificado } from "@/components/aluno/CardCertificado";
import { getCertificadosMock } from "@/lib/mock/certificados";

// Mesmo acervo que aparece na interface do aluno — dado mock.
export default function CertificadosDoAluno() {
  const certificados = getCertificadosMock();

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <span className="font-mono text-xs uppercase tracking-widest text-neutral-400">
          Acervo
        </span>
        <h1 className="mt-1 text-2xl font-bold">Certificados do aluno</h1>
      </div>

      {certificados.length === 0 ? (
        <p className="text-neutral-500">Nenhum certificado ainda.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {certificados.map((certificado) => (
            <CardCertificado key={certificado.id} certificado={certificado} />
          ))}
        </div>
      )}
    </div>
  );
}
