// Tipos que espelham as regras do motor de certificação (docs/ESCOPO.md § 04, § 05).
// Ainda sem banco — servem pro mock e já deixam o formato pronto pra quando a
// tabela real existir.

export type Plano = "basico" | "intermediario" | "avancado";

export const NOME_DO_PLANO: Record<Plano, string> = {
  basico: "Básico",
  intermediario: "Intermediário",
  avancado: "Avançado",
};

// Dias de aula por semana, por plano — § 04.
export const DIAS_POR_PLANO: Record<Plano, number> = {
  basico: 3,
  intermediario: 5,
  avancado: 7,
};

export type StatusSemana = {
  numero: number; // 1 a 4
  diasCumpridos: number;
  diasNecessarios: number;
};

export type ProgressoDoMes = {
  mesReferencia: string; // ex. "Agosto 2026"
  plano: Plano;
  semanas: StatusSemana[];
};

export function semanaCompleta(semana: StatusSemana): boolean {
  return semana.diasCumpridos >= semana.diasNecessarios;
}

// § 05: certificado só sai se TODAS as semanas do mês baterem 100% da cota.
export function elegivelParaCertificado(progresso: ProgressoDoMes): boolean {
  return progresso.semanas.every(semanaCompleta);
}

export type Idioma =
  | "espanhol"
  | "frances"
  | "ingles"
  | "mandarim"
  | "italiano";

export const NOME_DO_IDIOMA: Record<Idioma, string> = {
  espanhol: "Espanhol",
  frances: "Francês",
  ingles: "Inglês",
  mandarim: "Mandarim",
  italiano: "Italiano",
};

// Um certificado por mês conquistado (§ 02, § 05) — nunca por aula ou por
// semana. codigoVerificacao é o que a página pública /verificar/[codigo] confere.
export type Certificado = {
  id: string;
  mesReferencia: string; // ex. "Julho 2026"
  idioma: Idioma;
  plano: Plano;
  codigoVerificacao: string;
  emitidoEm: string; // data ISO
};

// Sotaque regional escolhível por idioma — decidido que entra desde o MVP (§ 07,
// § 10). Mandarim e Italiano têm menos variantes por enquanto (§ 07: só o padrão
// no começo pra não multiplicar custo de voz antes do piloto de idioma).
export const SOTAQUES_POR_IDIOMA: Record<Idioma, string[]> = {
  espanhol: ["Espanha", "México", "Argentina"],
  ingles: ["Americano", "Britânico"],
  frances: ["França", "Québec"],
  mandarim: ["China continental", "Taiwan"],
  italiano: ["Padrão"],
};

// Elenco diverso de tutores de IA (§ 03) — todos seguem a mesma diretriz de
// comportamento (amigável, corrige sem constranger); o que muda aqui é só a
// apresentação.
export type Tutor = {
  id: string;
  nome: string;
  descricao: string;
};

export type PerfilDoAluno = {
  idioma: Idioma;
  sotaque: string;
  plano: Plano;
  tutorId: string;
  objetivoPessoal: string; // muda os temas de conversa do tutor (§ 11)
};

// Espelha public.papel_usuario (supabase/migrations/0001_schema_inicial.sql).
export type PapelUsuario = "aluno" | "responsavel" | "admin";

// ---- Tipos da interface do criador (§ 03, § 12) ----

export type StatusAssinatura = "ativa" | "atrasada" | "cancelada";

export type Assinatura = {
  id: string;
  alunoNome: string;
  plano: Plano;
  status: StatusAssinatura;
  proximaCobranca: string; // data ISO — cobrada pelo Asaas, isto é só visão
};

export type StatusConteudo = "publicado" | "em curadoria";

export type ConteudoPorNivel = {
  idioma: Idioma;
  nivel: string; // ex. "A1-A2"
  status: StatusConteudo;
};

// § 05: nota mínima de qualidade decide se a aula conta como cumprida —
// sempre automática, nenhum plano tem revisão humana.
export type RegraDeCertificacao = {
  plano: Plano;
  notaMinima: number; // 0 a 100
};

// § 12: cupom por escola, válido só na primeira mensalidade; QR do panfleto
// carrega esse código embutido.
export type Cupom = {
  id: string;
  nomeEscola: string;
  descontoPercentual: number;
  usos: number;
};

export type OrigemCadastro = {
  id: string;
  alunoNome: string;
  escolaOrigem: string;
  cupomUsado: string | null;
  cadastradoEm: string; // data ISO
};

export type RegistroAuditoriaLgpd = {
  id: string;
  responsavelNome: string;
  alunoNome: string;
  acao: string; // ex. "Consentimento dado"
  dataHora: string; // ISO
};

export type StatusProspeccao = "contatada" | "negociando" | "fechada";

export type ParceriaEscola = {
  id: string;
  nomeEscola: string;
  status: StatusProspeccao;
};
