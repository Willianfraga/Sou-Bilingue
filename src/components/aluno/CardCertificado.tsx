import Link from "next/link";
import { NOME_DO_IDIOMA, NOME_DO_PLANO, type Certificado } from "@/lib/types";

// § 06: certificado precisa ser verificável numa página pública, não só um PDF
// estático — por isso o código sempre linka pra /verificar/[codigo].
export function CardCertificado({ certificado }: { certificado: Certificado }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-neutral-200 px-5 py-4">
      <div>
        <p className="font-semibold">{certificado.mesReferencia}</p>
        <p className="text-sm text-neutral-500">
          {NOME_DO_IDIOMA[certificado.idioma]} · plano{" "}
          {NOME_DO_PLANO[certificado.plano]}
        </p>
      </div>
      <div className="text-right">
        <Link
          href={`/verificar/${certificado.codigoVerificacao}`}
          className="font-mono text-xs text-teal-700 underline"
        >
          {certificado.codigoVerificacao}
        </Link>
        <p className="mt-1 text-xs text-neutral-400">
          emitido {certificado.emitidoEm}
        </p>
      </div>
    </div>
  );
}
