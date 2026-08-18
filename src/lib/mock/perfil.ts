import type { PerfilDoAluno, Tutor } from "@/lib/types";

// Elenco diverso (§ 03) — dado fixo, sem avatar de verdade ainda.
export function getTutoresMock(): Tutor[] {
  return [
    { id: "tutor-clara", nome: "Clara", descricao: "Mulher, sotaque neutro" },
    { id: "tutor-diego", nome: "Diego", descricao: "Homem, 30 e poucos anos" },
    { id: "tutor-mei", nome: "Mei", descricao: "Mulher, voz jovem" },
    { id: "tutor-seu-antonio", nome: "Seu Antônio", descricao: "Senhor, tom pausado" },
  ];
}

export function getPerfilDoAlunoMock(): PerfilDoAluno {
  return {
    idioma: "espanhol",
    sotaque: "Argentina",
    plano: "intermediario",
    tutorId: "tutor-clara",
    objetivoPessoal: "Viagem — quer se virar sozinho numa viagem pra Buenos Aires",
  };
}
