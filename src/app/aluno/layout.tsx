import { redirect } from "next/navigation";
import { EstruturaAluno } from "@/components/aluno/EstruturaAluno";
import { requirePapel } from "@/lib/auth/guards";
import { getOnboardingDoAluno } from "@/lib/data/onboarding";
import { nomeParaOTutor } from "@/lib/onboarding/contexto";
import { redirecionamentoDaAreaDoAluno } from "@/lib/onboarding/fluxo";

// Área do aluno: menu bento (grade de atalhos) em vez de barra lateral —
// atalhos em src/lib/aluno/inicio.ts.
export default async function AlunoLayout({ children }: { children: React.ReactNode }) {
  const sessao = await requirePapel("aluno");

  // Entrevista de boas-vindas é obrigatória antes das aulas.
  const onboarding = await getOnboardingDoAluno(sessao.userId);
  const destino = redirecionamentoDaAreaDoAluno(onboarding);
  if (destino) redirect(destino);

  return <EstruturaAluno nome={nomeParaOTutor(onboarding?.respostas, sessao.nome).split(/\s+/)[0]}>{children}</EstruturaAluno>;
}
