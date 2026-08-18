// Dado fixo — sem banco por trás. Existe só quando o aluno é menor de idade
// (docs/ESCOPO.md § 03, § 02: consentimento LGPD obrigatório antes de liberar
// o cadastro do menor).
export function getConsentimentoMock() {
  return {
    responsavelNome: "Marina Fraga",
    alunoNome: "Pedro Fraga",
    consentidoEm: "2026-07-15",
  };
}

export function getLimitesDeUsoMock() {
  return {
    janelaPermitida: "16h às 20h, dias de aula",
    alertaComportamentoForaDoPadrao: true,
  };
}
