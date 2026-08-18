import type {
  Assinatura,
  Cupom,
  ConteudoPorNivel,
  OrigemCadastro,
  ParceriaEscola,
  RegistroAuditoriaLgpd,
  RegraDeCertificacao,
} from "@/lib/types";

// Dado fixo — sem banco por trás. Interface do criador é só acompanhamento,
// não operação (§ 03): nenhuma tela aqui tem botão de "aprovar" ou "emitir".

export function getAssinaturasMock(): Assinatura[] {
  return [
    { id: "sub-1", alunoNome: "Pedro Fraga", plano: "intermediario", status: "ativa", proximaCobranca: "2026-09-01" },
    { id: "sub-2", alunoNome: "Ana Souza", plano: "basico", status: "ativa", proximaCobranca: "2026-09-03" },
    { id: "sub-3", alunoNome: "Lucas Melo", plano: "avancado", status: "atrasada", proximaCobranca: "2026-08-20" },
  ];
}

export function getConteudoMock(): ConteudoPorNivel[] {
  return [
    { idioma: "espanhol", nivel: "A1-A2", status: "publicado" },
    { idioma: "espanhol", nivel: "B1-B2", status: "publicado" },
    { idioma: "espanhol", nivel: "C1+", status: "em curadoria" },
  ];
}

export function getRegrasDeCertificacaoMock(): RegraDeCertificacao[] {
  return [
    { plano: "basico", notaMinima: 60 },
    { plano: "intermediario", notaMinima: 70 },
    { plano: "avancado", notaMinima: 80 },
  ];
}

export function getCuponsMock(): Cupom[] {
  return [
    { id: "cup-1", nomeEscola: "Colégio Nova Era", descontoPercentual: 20, usos: 14 },
    { id: "cup-2", nomeEscola: "Escola Municipal Vieira", descontoPercentual: 15, usos: 6 },
  ];
}

export function getOrigemCadastrosMock(): OrigemCadastro[] {
  return [
    { id: "orig-1", alunoNome: "Pedro Fraga", escolaOrigem: "Colégio Nova Era", cupomUsado: "cup-1", cadastradoEm: "2026-08-05" },
    { id: "orig-2", alunoNome: "Ana Souza", escolaOrigem: "Escola Municipal Vieira", cupomUsado: "cup-2", cadastradoEm: "2026-08-10" },
    { id: "orig-3", alunoNome: "Lucas Melo", escolaOrigem: "sem origem (link direto)", cupomUsado: null, cadastradoEm: "2026-08-12" },
  ];
}

export function getAuditoriaLgpdMock(): RegistroAuditoriaLgpd[] {
  return [
    { id: "aud-1", responsavelNome: "Marina Fraga", alunoNome: "Pedro Fraga", acao: "Consentimento dado", dataHora: "2026-07-15 14:32" },
  ];
}

export function getParceriasEscolasMock(): ParceriaEscola[] {
  return [
    { id: "esc-1", nomeEscola: "Colégio Nova Era", status: "negociando" },
    { id: "esc-2", nomeEscola: "Escola Municipal Vieira", status: "contatada" },
    { id: "esc-3", nomeEscola: "Instituto Aprender Mais", status: "fechada" },
  ];
}
