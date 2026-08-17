import { PlaceholderScreen } from "@/components/PlaceholderScreen";

// Rota pública (sem login) para conferir a autenticidade de um certificado —
// o código vem impresso/embutido no PDF. Qualquer pessoa (escola, empregador,
// o próprio responsável) pode acessar sem depender só da palavra do aluno.
export default async function VerificarCertificado({
  params,
}: {
  params: Promise<{ codigo: string }>;
}) {
  const { codigo } = await params;

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-16">
      <PlaceholderScreen
        title={`Verificar certificado ${codigo}`}
        escopo="ESCOPO.md § 05, § 06"
        descricao="Página pública que confirma se o código pertence a um certificado real, com nome do aluno, idioma, mês e plano — sem exigir login. Existe porque um certificado com nome de alguém tem valor mesmo sem dinheiro envolvido, e precisa ser verificável, não só um PDF estático."
      />
    </main>
  );
}
