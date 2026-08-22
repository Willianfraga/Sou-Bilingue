/**
 * Gerador de CSV para relatórios de consumo
 */

interface SessaoExport {
  data: string;
  horario: string;
  duracao_minutos: number;
  tipo: string;
  horas: number;
}

interface TopupExport {
  data: string;
  horas: number;
  valor: number;
  status: string;
  expiracao: string;
}

interface ResumoExport {
  periodo: string;
  horas_total: number;
  horas_usadas: number;
  horas_restantes: number;
  percentual_usado: number;
  sessoes_total: number;
  duracao_media_minutos: number;
}

/**
 * Gera CSV de sessões de uso
 */
export function gerarCSVSessoes(sessoes: SessaoExport[]): string {
  const headers = ["Data", "Horário", "Duração (min)", "Tipo", "Horas"];
  const rows = sessoes.map((s) => [
    s.data,
    s.horario,
    s.duracao_minutos.toString(),
    s.tipo,
    s.horas.toFixed(2),
  ]);

  return gerarCSV(headers, rows);
}

/**
 * Gera CSV de recargas de horas
 */
export function gerarCSVTopups(topups: TopupExport[]): string {
  const headers = ["Data", "Horas", "Valor (R$)", "Status", "Expiração"];
  const rows = topups.map((t) => [
    t.data,
    t.horas.toString(),
    t.valor.toFixed(2),
    t.status,
    t.expiracao,
  ]);

  return gerarCSV(headers, rows);
}

/**
 * Gera CSV de resumo mensal
 */
export function gerarCSVResumo(resumo: ResumoExport): string {
  const headers = ["Métrica", "Valor"];
  const rows = [
    ["Período", resumo.periodo],
    ["Horas Totais", resumo.horas_total.toString()],
    ["Horas Usadas", resumo.horas_usadas.toString()],
    ["Horas Restantes", resumo.horas_restantes.toString()],
    ["Percentual Usado", `${resumo.percentual_usado}%`],
    ["Sessões Totais", resumo.sessoes_total.toString()],
    ["Duração Média (min)", resumo.duracao_media_minutos.toString()],
  ];

  return gerarCSV(headers, rows);
}

/**
 * Função auxiliar para gerar CSV
 */
function gerarCSV(headers: string[], rows: string[][]): string {
  const headerRow = headers.map(escaparCSV).join(",");
  const dataRows = rows.map((row) => row.map(escaparCSV).join(","));

  return [headerRow, ...dataRows].join("\n");
}

/**
 * Escapa valores para CSV (aspas e quebras de linha)
 */
function escaparCSV(value: string): string {
  if (typeof value !== "string") {
    value = String(value);
  }

  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

/**
 * Baixa arquivo CSV no navegador
 */
export function baixarCSV(csv: string, nomeArquivo: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", nomeArquivo);
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
