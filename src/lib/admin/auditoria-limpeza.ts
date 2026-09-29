// Remove dados sensíveis antes de gravar na auditoria. Módulo puro (testado).

const SENSIVEL = /senha|password|token|secret|segredo|chave|api[_-]?key|cpf|cartao|card|authorization/i;

export function limparParaAuditoria(valor: unknown, profundidade = 0): unknown {
  if (valor === null || valor === undefined) return valor ?? null;
  if (profundidade > 4) return "[…]";
  if (typeof valor === "string") return valor.length > 500 ? `${valor.slice(0, 500)}…` : valor;
  if (typeof valor !== "object") return valor;
  if (Array.isArray(valor)) return valor.slice(0, 50).map((v) => limparParaAuditoria(v, profundidade + 1));
  const saida: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(valor as Record<string, unknown>)) {
    saida[k] = SENSIVEL.test(k) ? "[oculto]" : limparParaAuditoria(v, profundidade + 1);
  }
  return saida;
}
