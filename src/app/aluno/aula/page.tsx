import { AulaChat } from "@/components/aluno/AulaChat";
import { requireSessao } from "@/lib/auth/guards";
import { getPerfilDoAluno } from "@/lib/data/alunos";
import { getTutorPorId } from "@/lib/data/tutores";
import { NOME_DO_IDIOMA } from "@/lib/types";

// Server Component busca o dado real (perfil + tutor do banco); o Client
// Component (AulaChat) só renderiza — mesmo padrão do projeto "academia flow".
export default async function Aula() {
  const sessao = await requireSessao();
  const perfil = await getPerfilDoAluno(sessao.userId);

  if (!perfil) {
    return <p className="text-neutral-500">Perfil não encontrado.</p>;
  }

  const tutor = await getTutorPorId(perfil.tutorId);
  const tituloTutor = `${tutor?.nome ?? "Tutor"} · ${NOME_DO_IDIOMA[perfil.idioma]}`;

  return <AulaChat tituloTutor={tituloTutor} />;
}
