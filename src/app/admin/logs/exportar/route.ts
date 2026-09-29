import { listarAuditoria, registrarAuditoria } from "@/lib/admin/auditoria";
import { paraCsv } from "@/lib/admin/csv";
import { inicioDoDia } from "@/lib/admin/periodos";
import { requireArea } from "@/lib/admin/sessao";

const dia = (v: string | null) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);

// Exporta a auditoria filtrada em CSV (até 5.000 linhas). A exportação
// também fica registrada.
export async function GET(request: Request) {
  const sessao = await requireArea("logs");
  const u = new URL(request.url);
  const de = dia(u.searchParams.get("de"));
  const ate = dia(u.searchParams.get("ate"));
  const { linhas } = await listarAuditoria({
    pagina: 1,
    porPagina: 5000,
    entidade: u.searchParams.get("entidade") || undefined,
    resultado: u.searchParams.get("resultado") || undefined,
    de: de ? inicioDoDia(de).toISOString() : undefined,
    ate: ate ? new Date(inicioDoDia(ate).getTime() + 86_400_000).toISOString() : undefined,
  });
  await registrarAuditoria({ adminId: sessao.userId, acao: "auditoria.exportar", entidade: "configuracao", entidadeId: "admin_auditoria", depois: { linhas: linhas.length }, resultado: "ok" });

  const csv = paraCsv(
    ["data", "admin", "acao", "entidade", "entidade_id", "resultado", "motivo", "ip", "antes", "depois"],
    linhas.map((l) => [l.criado_em, l.nomeAdmin ?? "sistema", l.acao, l.entidade, l.entidade_id, l.resultado, l.motivo, l.ip, l.antes, l.depois]),
  );
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="auditoria-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
