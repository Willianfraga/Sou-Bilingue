// Regras do cancelamento pelo aluno. Módulo puro (testado em
// test/cancelamento.test.mjs).
//
// Política (27 set 2026): cancelar interrompe as PRÓXIMAS cobranças na hora
// e o acesso continua até o fim do período já pago. Não há reembolso
// automático do período em curso — ver docs/plans-and-credits.md.

const iso = (d: Date) => d.toISOString().slice(0, 10);

function somarUmMes(data: string): string {
  const d = new Date(`${data}T12:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + 1);
  return iso(d);
}

// Fim do período já pago: o mais tarde entre o fim do ciclo registrado e um
// mês após o último pagamento confirmado (o ciclo nem sempre é atualizado na
// renovação), nunca antes de hoje.
export function calcularAcessoAte(p: { cicloFim: string | null; ultimoPagamento: string | null; hoje: Date }): string {
  const candidatos = [iso(p.hoje)];
  if (p.cicloFim) candidatos.push(p.cicloFim.slice(0, 10));
  if (p.ultimoPagamento) candidatos.push(somarUmMes(p.ultimoPagamento.slice(0, 10)));
  return candidatos.sort().at(-1)!;
}

// Assinatura "ativa" com cancelamento pedido só dá acesso até acesso_ate
// (inclusive).
export function assinaturaDaAcesso(
  sub: { status: string; cancelamento_solicitado_em?: string | null; acesso_ate?: string | null },
  hoje: Date,
): boolean {
  if (sub.status !== "ativa") return false;
  if (!sub.cancelamento_solicitado_em) return true;
  return Boolean(sub.acesso_ate) && iso(hoje) <= sub.acesso_ate!.slice(0, 10);
}

export const MOTIVOS_DE_CANCELAMENTO = [
  "Preço",
  "Falta de tempo",
  "Não gostei das aulas",
  "Problema técnico",
  "Consegui o que queria",
  "Outro motivo",
] as const;

export function formatarData(data: string): string {
  const [a, m, d] = data.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
}
