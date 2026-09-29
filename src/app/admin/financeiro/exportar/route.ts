import { registrarAuditoria } from "@/lib/admin/auditoria";
import { paraCsv } from "@/lib/admin/csv";
import { diaBrasilia } from "@/lib/admin/periodos";
import { requireArea } from "@/lib/admin/sessao";
import { getDemonstrativo } from "@/lib/financeiro/dados";

// Demonstrativo mensal em CSV (valores em reais, com a natureza de cada mês).
export async function GET(request: Request) {
  const sessao = await requireArea("financeiro");
  const meses = [3, 6, 12].includes(Number(new URL(request.url).searchParams.get("meses"))) ? Number(new URL(request.url).searchParams.get("meses")) : 6;
  const atual = diaBrasilia(new Date()).slice(0, 7);
  const [a, m] = atual.split("-").map(Number);
  const inicio = new Date(Date.UTC(a, m - meses, 1)).toISOString().slice(0, 10);
  const { linhas, cambio } = await getDemonstrativo(inicio, `${atual}-01`);
  await registrarAuditoria({ adminId: sessao.userId, acao: "financeiro.exportar", entidade: "configuracao", entidadeId: "demonstrativo", depois: { meses }, resultado: "ok" });

  const r = (c: number | null) => (c === null ? "" : (c / 100).toFixed(2).replace(".", ","));
  const csv = paraCsv(
    [
      "mes", "natureza", "mensalidades", "horas_extras", "receita_bruta", "reembolsos", "taxas_gateway", "gateway_parcial", "receita_liquida",
      "ia", "fixos_confirmados", "fixos_estimados", "variaveis_confirmados", "variaveis_estimados", "impostos", "custo_total", "resultado",
      "margem_percentual", "alunos_ativos", "alunos_pagantes", "cambio_usd_brl",
    ],
    linhas.map((l) => [
      l.mes.slice(0, 7), l.natureza, r(l.receitaAssinaturasC), r(l.receitaHorasExtrasC), r(l.receitaBrutaC), r(l.reembolsosC), r(l.taxasGatewayC),
      l.gatewayParcial ? "sim" : "não", r(l.receitaLiquidaC), r(l.iaC), r(l.fixosConfirmadosC), r(l.fixosEstimadosC), r(l.variaveisConfirmadosC),
      r(l.variaveisEstimadosC), r(l.impostosC), r(l.custoTotalC), r(l.resultadoC), l.margem === null ? "" : l.margem.toFixed(1).replace(".", ","),
      l.ativos, l.pagantes, cambio ? cambio.taxa.toFixed(4).replace(".", ",") : "",
    ]),
  );
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="financeiro-${atual}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
