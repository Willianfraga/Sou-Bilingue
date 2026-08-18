import { CardCertificado } from "@/components/aluno/CardCertificado";
import { requireSessao } from "@/lib/auth/guards";
import { getCertificados } from "@/lib/data/certificados";

// Dado real — src/lib/data/certificados.ts, RLS ativo. Sem geração de PDF
// ainda; o botão de portfólio fica desabilitado até isso existir de verdade
// (docs/ESCOPO.md § 07: geração de PDF por template + portfólio único).
export default async function Certificados() {
  const sessao = await requireSessao();
  const certificados = await getCertificados(sessao.userId);

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="font-mono text-xs uppercase tracking-widest text-neutral-400">
            Acervo
          </span>
          <h1 className="mt-1 text-2xl font-bold">Certificados</h1>
        </div>
        <button
          type="button"
          disabled
          title="Geração de PDF ainda não implementada"
          className="shrink-0 cursor-not-allowed rounded-md border border-neutral-200 px-4 py-2 text-sm text-neutral-400"
        >
          Baixar portfólio (PDF)
        </button>
      </div>

      {certificados.length === 0 ? (
        <p className="text-neutral-500">
          Nenhum certificado ainda. Ele sai sozinho no fechamento do mês, se todas
          as semanas baterem a cota — nenhum botão pra emitir na mão.
        </p>
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
