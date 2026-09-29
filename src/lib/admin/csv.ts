// CSV para exportações do painel. Módulo puro (testado). Separador ";" e BOM
// para o Excel em português abrir acentos e colunas certo. Protege contra
// injeção de fórmula (célula começando com = + - @ vira texto).

function celula(v: unknown): string {
  if (v === null || v === undefined) return "";
  let t = typeof v === "object" ? JSON.stringify(v) : String(v);
  if (/^[=+\-@\t\r]/.test(t)) t = `'${t}`;
  return /[";\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
}

export function paraCsv(cabecalho: string[], linhas: unknown[][]): string {
  return "﻿" + [cabecalho, ...linhas].map((l) => l.map(celula).join(";")).join("\r\n") + "\r\n";
}
