import { requireSessao } from "@/lib/auth/guards";
import { getAlunoDoResponsavel } from "@/lib/data/alunos";
import { getConsentimento } from "@/lib/data/consentimento";

// § 02: consentimento LGPD (Art. 14) obrigatório antes de liberar o cadastro
// do menor — dado real agora.
export default async function ConsentimentoLgpd() {
  const sessao = await requireSessao();
  const aluno = await getAlunoDoResponsavel(sessao.userId);

  if (!aluno) {
    return (
      <p className="text-neutral-500">Nenhum aluno vinculado a esta conta.</p>
    );
  }

  const consentimento = await getConsentimento(aluno.id);

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <div>
        <span className="font-mono text-xs uppercase tracking-widest text-neutral-400">
          LGPD · Art. 14
        </span>
        <h1 className="mt-1 text-2xl font-bold">Consentimento</h1>
      </div>

      {consentimento ? (
        <div className="rounded-lg border border-teal-200 bg-teal-50 px-5 py-4 text-sm text-teal-800">
          <p>
            <strong>{consentimento.responsavelNome}</strong> consentiu com o uso
            dos dados de <strong>{consentimento.alunoNome}</strong> (nome,
            progresso e certificados emitidos) em{" "}
            <strong>{consentimento.consentidoEm}</strong>.
          </p>
        </div>
      ) : (
        <p className="text-neutral-500">Nenhum consentimento registrado.</p>
      )}

      <p className="text-sm text-neutral-500">
        Sem esse consentimento, o cadastro do aluno menor não é ativado. Você
        pode revogar a qualquer momento — isso suspende o acesso do aluno até
        um novo consentimento.
      </p>
    </div>
  );
}
