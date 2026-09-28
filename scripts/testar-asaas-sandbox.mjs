// Confere, no Asaas SANDBOX, o formato das chamadas do checkout: cliente,
// cobrança avulsa da 1ª mensalidade com desconto e assinatura recorrente
// começando no mês seguinte. Recusa rodar fora do sandbox.
//   node --import ./test/suporte/registrar.mjs scripts/testar-asaas-sandbox.mjs
import { readFileSync } from "node:fs";

for (const linha of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = linha.match(/^\s*(ASAAS_[A-Z_]+)\s*=\s*(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
if (!/sandbox/.test(process.env.ASAAS_API_URL ?? "")) {
  console.error("ASAAS_API_URL não é o sandbox — abortado.");
  process.exit(1);
}

const asaas = await import("../src/lib/asaas/client.ts");
const { valorPrimeiraMensalidade } = await import("../src/lib/billing/planos.ts");

const hoje = new Date();
const mesQueVem = new Date(hoje);
mesQueVem.setMonth(mesQueVem.getMonth() + 1);
const iso = (d) => d.toISOString().split("T")[0];

const cliente = await asaas.createCustomer({
  name: "Teste Automatizado Sou Bilingue",
  email: `sandbox.${Date.now()}@soubilingue.test`,
  cpfCnpj: "24971563792", // CPF de teste válido (gerado), sandbox
  externalReference: "soubilingue:teste-sandbox",
});
const valor = valorPrimeiraMensalidade(59.8, "essencial");
const cobranca = await asaas.createPayment({
  customerId: cliente.id,
  billingType: "UNDEFINED",
  value: valor,
  dueDate: iso(hoje),
  description: "Sou Bilíngue - teste sandbox - 1ª mensalidade com 50% de desconto",
  externalReference: "soubilingue:primeira:00000000-0000-0000-0000-000000000000",
});
const recorrente = await asaas.createSubscription({
  customerId: cliente.id,
  billingType: "UNDEFINED",
  value: 59.8,
  nextDueDate: iso(mesQueVem),
  cycle: "MONTHLY",
  description: "Sou Bilíngue - teste sandbox - recorrente",
  externalReference: "soubilingue:teste-sandbox",
});

console.log(JSON.stringify({
  cobranca_valor: cobranca.value,
  cobranca_tem_fatura: Boolean(cobranca.invoiceUrl),
  cobranca_status: cobranca.status,
  recorrente_valor: recorrente.value,
  recorrente_primeiro_vencimento: recorrente.nextDueDate,
  esperado_primeiro_vencimento: iso(mesQueVem),
}, null, 2));

// Limpeza no sandbox
await asaas.cancelSubscription(recorrente.id).catch(() => {});
