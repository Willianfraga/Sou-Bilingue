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
