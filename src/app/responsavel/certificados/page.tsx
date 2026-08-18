import { CardCertificado } from "@/components/aluno/CardCertificado";
import { requireSessao } from "@/lib/auth/guards";
import { getAlunoDoResponsavel } from "@/lib/data/alunos";
import { getCertificados } from "@/lib/data/certificados";

// Mesmo acervo que aparece na interface do aluno — dado real, filtrado pelo
// aluno vinculado a este responsável.
export default async function CertificadosDoAluno() {
  const sessao = await requireSessao();
  const aluno = await getAlunoDoResponsavel(sessao.userId);

  if (!aluno) {
    return (
      <p className="text-neutral-500">Nenhum aluno vinculado a esta conta.</p>
    );
  }

  const certificados = await getCertificados(aluno.id);

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <span className="font-mono text-xs uppercase tracking-widest text-neutral-400">
          Acervo · {aluno.nome}
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
