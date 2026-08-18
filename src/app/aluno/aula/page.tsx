import { AulaChat } from "@/components/aluno/AulaChat";
import { getTutorPorNome } from "@/lib/data/tutores";
import { getPerfilDoAlunoMock, NOME_DO_TUTOR_MOCK } from "@/lib/mock/perfil";
import { NOME_DO_IDIOMA } from "@/lib/types";

// Server Component busca o dado (tutor real do banco); o Client Component
// (AulaChat) só renderiza — mesmo padrão do projeto "academia flow".
export default async function Aula() {
  const perfil = getPerfilDoAlunoMock();
  const tutor = await getTutorPorNome(NOME_DO_TUTOR_MOCK);

  const tituloTutor = `${tutor?.nome ?? "Tutor"} · ${NOME_DO_IDIOMA[perfil.idioma]}`;

  return <AulaChat tituloTutor={tituloTutor} />;
}
