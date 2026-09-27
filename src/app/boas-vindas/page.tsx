import { redirect } from "next/navigation";
import { EntrevistaBoasVindas } from "@/components/onboarding/EntrevistaBoasVindas";
import { requirePapel } from "@/lib/auth/guards";
import { getPerfilDoAluno } from "@/lib/data/alunos";
import { getOnboardingDoAluno } from "@/lib/data/onboarding";
import { getTutorPorId } from "@/lib/data/tutores";
import { ROTA_PRIMEIRA_AULA, modoDaEntrevista } from "@/lib/onboarding/fluxo";
import { PERGUNTAS, etapaValida, type Respostas } from "@/lib/onboarding/questionario";

export const dynamic = "force-dynamic";

// Entrevista de boas-vindas — fica fora de /aluno de propósito: o layout de
// /aluno redireciona para cá enquanto ela não for concluída.
export default async function BoasVindas({
  searchParams,
}: {
  searchParams: Promise<{ modo?: string }>;
}) {
  const sessao = await requirePapel("aluno");
  const perfil = await getPerfilDoAluno(sessao.userId);
  if (!perfil) redirect("/cadastro/onboarding/idioma");

  const { modo: pedido } = await searchParams;
  const estado = await getOnboardingDoAluno(sessao.userId);
  const modo = modoDaEntrevista(estado, pedido);
  if (modo === "liberado") redirect(ROTA_PRIMEIRA_AULA);

  const tutor = await getTutorPorId(perfil.tutorId);
  const temRascunho = estado && Object.keys(estado.rascunho).length > 0;

  // Sugestões iniciais: o idioma já escolhido no cadastro e o primeiro nome.
  const sugestoes: Respostas = {
    idiomaAlvo: perfil.idioma,
    nomePreferido: sessao.nome.trim().split(/\s+/)[0] ?? "",
  };

  let respostasIniciais: Respostas;
  let etapaInicial: number;
  if (temRascunho) {
    respostasIniciais = { ...sugestoes, ...estado.rascunho };
    etapaInicial = etapaValida(estado.etapaAtual);
  } else if (modo === "editar") {
    respostasIniciais = { ...sugestoes, ...estado?.respostas };
    etapaInicial = PERGUNTAS.length; // abre direto no resumo
  } else {
    respostasIniciais = { ...sugestoes, ...estado?.respostas };
    etapaInicial = 0;
  }

  return (
    <EntrevistaBoasVindas
      modo={modo}
      tutorNome={tutor?.nome ?? "seu tutor"}
      tutorFoto={tutor?.foto_url}
      respostasIniciais={respostasIniciais}
      etapaInicial={etapaInicial}
      chaveLocal={sessao.userId}
      destinoAoConcluir={modo === "editar" ? "/aluno/perfil#preferencias" : ROTA_PRIMEIRA_AULA}
    />
  );
}
