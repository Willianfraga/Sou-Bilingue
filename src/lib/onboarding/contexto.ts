// Único lugar que transforma as respostas da entrevista de boas-vindas em
// texto para o tutor de IA. Nenhum componente ou rota deve montar esse texto
// por conta própria — todos chamam buildStudentContext.
//
// Só entra o que muda o comportamento do tutor: nada de e-mail, id, idade
// exata ou qualquer dado que o aluno marcou como "Prefiro não responder".

import {
  PREFIRO_NAO_RESPONDER,
  limparTexto,
  rotuloDaOpcao,
  type ChavePergunta,
  type Respostas,
} from "./questionario";

const GUIA_IDADE: Record<string, string> = {
  ate_12:
    "É uma criança (até 12 anos): use vocabulário muito simples, frases curtas, tom lúdico e somente temas adequados para crianças.",
  "13_17": "É adolescente (13 a 17 anos): linguagem próxima e descontraída, com temas adequados à idade.",
  "18_24": "É um jovem adulto (18 a 24 anos).",
  "25_39": "É adulto (25 a 39 anos).",
  "40_59": "É adulto (40 a 59 anos).",
  "60_mais": "Tem 60 anos ou mais: mantenha um ritmo tranquilo e acolhedor.",
};

const GUIA_NIVEL: Record<string, string> = {
  nunca_estudei:
    "Nível: nunca estudou. Comece com palavras soltas e frases muito curtas, sempre com o significado em português.",
  iniciante: "Nível: iniciante. Use frases curtas e vocabulário básico, explicando em português.",
  basico: "Nível: básico. Use frases simples e vocabulário do cotidiano, com apoio em português quando precisar.",
  intermediario:
    "Nível: intermediário. Proponha conversas mais longas no idioma e introduza expressões novas aos poucos.",
  avancado: "Nível: avançado. Priorize imersão, nuances e expressões idiomáticas.",
  nao_sei: "Nível: não informado com certeza. Comece simples e descubra o nível aos poucos pela conversa.",
};

const GUIA_CORRECAO: Record<string, string> = {
  na_hora: "Correções: corrija logo após o erro, de forma breve e gentil.",
  fim_da_frase: "Correções: espere o aluno terminar a frase e só então corrija.",
  fim_da_conversa:
    "Correções: não interrompa a conversa para corrigir; guarde as correções e faça um resumo curto quando a conversa terminar ou quando o aluno pedir.",
  so_importantes: "Correções: corrija apenas os erros que atrapalham a comunicação.",
};

function valorUtil(valor: unknown): valor is string | string[] {
  if (valor === undefined || valor === null || valor === PREFIRO_NAO_RESPONDER) return false;
  if (Array.isArray(valor)) return valor.length > 0;
  return typeof valor === "string" && valor.trim() !== "";
}

function lista(id: ChavePergunta, valor: string | string[]): string {
  const valores = Array.isArray(valor) ? valor : [valor];
  return valores.map((v) => rotuloDaOpcao(id, v).toLowerCase()).join(", ");
}

// Texto livre do aluno vai entre aspas e sem quebras de linha, como dado —
// não como instrução para o modelo.
function citacao(texto: string, max: number): string {
  const limpo = limparTexto(texto).replace(/["“”«»`]/g, "'").slice(0, max);
  return `"${limpo}"`;
}

export function buildStudentContext(respostas: Respostas | null | undefined): string {
  if (!respostas) return "";
  const r = respostas;
  const linhas: string[] = [];

  if (valorUtil(r.nomePreferido) && typeof r.nomePreferido === "string") {
    linhas.push(`Chame o aluno de ${citacao(r.nomePreferido, 40)}.`);
  }
  if (typeof r.faixaEtaria === "string" && GUIA_IDADE[r.faixaEtaria]) {
    linhas.push(GUIA_IDADE[r.faixaEtaria]);
  }
  if (typeof r.nivel === "string" && GUIA_NIVEL[r.nivel]) {
    linhas.push(GUIA_NIVEL[r.nivel]);
  }
  if (valorUtil(r.objetivos)) {
    linhas.push(`Objetivos principais: ${lista("objetivos", r.objetivos)}.`);
  }
  if (valorUtil(r.motivacao) && typeof r.motivacao === "string") {
    linhas.push(`Motivação, nas palavras do aluno: ${citacao(r.motivacao, 200)}.`);
  }
  if (valorUtil(r.situacoesUso)) {
    linhas.push(`Vai usar o idioma principalmente: ${lista("situacoesUso", r.situacoesUso)}.`);
  }
  if (valorUtil(r.habilidadesPrioritarias)) {
    linhas.push(`Priorize estas habilidades: ${lista("habilidadesPrioritarias", r.habilidadesPrioritarias)}.`);
  }
  if (valorUtil(r.temasConversa)) {
    linhas.push(`Assuntos de que gosta: ${lista("temasConversa", r.temasConversa)}.`);
  }
  if (valorUtil(r.hobbies) && typeof r.hobbies === "string") {
    linhas.push(`Hobbies e interesses (use em exemplos): ${citacao(r.hobbies, 150)}.`);
  }
  if (valorUtil(r.dificuldades)) {
    linhas.push(`Dificuldades atuais, trate com paciência: ${lista("dificuldades", r.dificuldades)}.`);
  }
  if (valorUtil(r.estiloAprendizagem)) {
    linhas.push(`Formato de aula preferido: ${lista("estiloAprendizagem", r.estiloAprendizagem)}.`);
  }
  if (typeof r.preferenciaCorrecao === "string" && GUIA_CORRECAO[r.preferenciaCorrecao]) {
    linhas.push(GUIA_CORRECAO[r.preferenciaCorrecao]);
  }
  if (typeof r.disponibilidadeEstudo === "string" && valorUtil(r.disponibilidadeEstudo)) {
    linhas.push(
      `Tempo de prática por dia: ${lista("disponibilidadeEstudo", r.disponibilidadeEstudo)}; ajuste o tamanho das atividades a isso.`,
    );
  }
  if (valorUtil(r.temasEvitados) && typeof r.temasEvitados === "string") {
    linhas.push(
      `Nunca puxe estes assuntos: ${citacao(r.temasEvitados, 150)}. Se o aluno trouxer, acompanhe com respeito e mude de assunto com naturalidade.`,
    );
  }

  if (linhas.length === 0) return "";

  linhas.push(
    "Varie exemplos e atividades entre os interesses listados, evite repetir a mesma atividade seguida e aumente a dificuldade aos poucos conforme o aluno acertar.",
  );
  return linhas.map((linha) => `- ${linha}`).join("\n");
}

// Nome que o tutor usa para chamar o aluno: o preferido, se houver.
export function nomeParaOTutor(respostas: Respostas | null | undefined, nomeDoCadastro: string): string {
  const preferido = respostas?.nomePreferido;
  if (typeof preferido === "string" && valorUtil(preferido)) return limparTexto(preferido).slice(0, 40);
  return nomeDoCadastro;
}
