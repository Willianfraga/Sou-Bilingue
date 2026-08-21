import { AulaChat } from "@/components/aluno/AulaChat";
import { requireSessao } from "@/lib/auth/guards";
import { getPerfilDoAluno } from "@/lib/data/alunos";
import { getTutorPorId } from "@/lib/data/tutores";
import { NOME_DO_IDIOMA } from "@/lib/types";

const IDIOMA_DA_VOZ = {
  espanhol: "es-ES",
  frances: "fr-FR",
  ingles: "en-US",
  mandarim: "zh-CN",
  italiano: "it-IT",
};

export default async function Aula() {
  const sessao = await requireSessao();
  const perfil = await getPerfilDoAluno(sessao.userId);
  if (!perfil) return <p className="text-neutral-500">Perfil nao encontrado.</p>;

  const tutor = await getTutorPorId(perfil.tutorId);
  const tituloTutor = `${tutor?.nome ?? "Tutor"} - ${NOME_DO_IDIOMA[perfil.idioma]}`;

  return <AulaChat tituloTutor={tituloTutor} idiomaDaVoz={IDIOMA_DA_VOZ[perfil.idioma]} />;
}
