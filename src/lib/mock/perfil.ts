import type { PerfilDoAluno } from "@/lib/types";

// Tutores agora vêm do banco de verdade (src/lib/data/tutores.ts). Esse
// perfil de aluno continua mock — nenhum cadastro real existe ainda —
// então o tutorId abaixo não corresponde a nenhum id real da tabela
// "tutores" (esses são gerados pelo Postgres). Resolve por nome via
// getTutorPorNome(NOME_DO_TUTOR_MOCK) em vez de por id.
export const NOME_DO_TUTOR_MOCK = "Clara";

export function getPerfilDoAlunoMock(): PerfilDoAluno {
  return {
    idioma: "espanhol",
    sotaque: "Argentina",
    plano: "intermediario",
    tutorId: "tutor-clara",
    objetivoPessoal: "Viagem — quer se virar sozinho numa viagem pra Buenos Aires",
  };
}
