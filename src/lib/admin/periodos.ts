// Períodos do painel no horário de Brasília (UTC−3, sem horário de verão
// desde 2019) e o período anterior de mesmo tamanho, para comparação.
// Módulo puro, testado em test/admin.test.mjs. Intervalos: [de, ate).

export const PERIODOS = ["hoje", "7d", "30d", "90d", "mes", "mes_anterior", "personalizado"] as const;
export type Periodo = (typeof PERIODOS)[number];

export const ROTULO_PERIODO: Record<Periodo, string> = {
  hoje: "Hoje",
  "7d": "Últimos 7 dias",
  "30d": "Últimos 30 dias",
  "90d": "Últimos 90 dias",
  mes: "Mês atual",
  mes_anterior: "Mês anterior",
  personalizado: "Personalizado",
};

export type Intervalo = { de: Date; ate: Date };
export type PeriodoResolvido = { periodo: Periodo; atual: Intervalo; anterior: Intervalo; rotulo: string };

const OFFSET_MS = 3 * 60 * 60_000; // Brasília = UTC−3
const DIA_MS = 24 * 60 * 60_000;
export const MAX_DIAS_PERSONALIZADO = 366;

// "AAAA-MM-DD" do calendário de Brasília.
export function diaBrasilia(instante: Date): string {
  return new Date(instante.getTime() - OFFSET_MS).toISOString().slice(0, 10);
}

// 00:00 de Brasília do dia "AAAA-MM-DD".
export function inicioDoDia(dia: string): Date {
  return new Date(`${dia}T00:00:00.000-03:00`);
}

function somarDias(dia: string, n: number): string {
  return new Date(inicioDoDia(dia).getTime() + n * DIA_MS + OFFSET_MS).toISOString().slice(0, 10);
}

function inicioDoMes(dia: string, deslocamento = 0): string {
  const [a, m] = dia.split("-").map(Number);
  const d = new Date(Date.UTC(a, m - 1 + deslocamento, 1));
  return d.toISOString().slice(0, 10);
}

const diaValido = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(inicioDoDia(v).getTime());

export function resolverPeriodo(entrada: { periodo?: unknown; de?: unknown; ate?: unknown }, agora = new Date()): PeriodoResolvido {
  let periodo: Periodo = (PERIODOS as readonly string[]).includes(String(entrada.periodo)) ? (entrada.periodo as Periodo) : "30d";
  const hoje = diaBrasilia(agora);
  let atual: Intervalo;
  let anterior: Intervalo;

  if (periodo === "personalizado") {
    if (!diaValido(entrada.de) || !diaValido(entrada.ate) || entrada.de > entrada.ate) {
      periodo = "30d";
    } else {
      let de = entrada.de;
      const ate = entrada.ate > hoje ? hoje : entrada.ate;
      if ((inicioDoDia(ate).getTime() - inicioDoDia(de).getTime()) / DIA_MS + 1 > MAX_DIAS_PERSONALIZADO) de = somarDias(ate, -(MAX_DIAS_PERSONALIZADO - 1));
      atual = { de: inicioDoDia(de), ate: inicioDoDia(somarDias(ate, 1)) };
      const tamanho = atual.ate.getTime() - atual.de.getTime();
      anterior = { de: new Date(atual.de.getTime() - tamanho), ate: atual.de };
      return { periodo, atual, anterior, rotulo: `${formatarDia(de)} a ${formatarDia(ate)}` };
    }
  }

  switch (periodo) {
    case "hoje": {
      const de = inicioDoDia(hoje);
      atual = { de, ate: agora };
      anterior = { de: new Date(de.getTime() - DIA_MS), ate: new Date(agora.getTime() - DIA_MS) };
      break;
    }
    case "mes": {
      const de = inicioDoDia(inicioDoMes(hoje));
      const deAnt = inicioDoDia(inicioDoMes(hoje, -1));
      atual = { de, ate: agora };
      const ateAnt = new Date(deAnt.getTime() + (agora.getTime() - de.getTime()));
      anterior = { de: deAnt, ate: ateAnt < de ? ateAnt : de };
      break;
    }
    case "mes_anterior": {
      atual = { de: inicioDoDia(inicioDoMes(hoje, -1)), ate: inicioDoDia(inicioDoMes(hoje)) };
      anterior = { de: inicioDoDia(inicioDoMes(hoje, -2)), ate: atual.de };
      break;
    }
    default: {
      const dias = periodo === "7d" ? 7 : periodo === "90d" ? 90 : 30;
      atual = { de: new Date(agora.getTime() - dias * DIA_MS), ate: agora };
      anterior = { de: new Date(agora.getTime() - 2 * dias * DIA_MS), ate: atual.de };
    }
  }
  return { periodo, atual, anterior, rotulo: ROTULO_PERIODO[periodo] };
}

export function formatarDia(dia: string): string {
  const [a, m, d] = dia.split("-");
  return `${d}/${m}/${a}`;
}

// Variação percentual com o período anterior (null quando não dá para
// comparar: anterior zero).
export function variacao(atual: number, anterior: number): number | null {
  if (!Number.isFinite(atual) || !Number.isFinite(anterior) || anterior === 0) return null;
  return ((atual - anterior) / Math.abs(anterior)) * 100;
}
