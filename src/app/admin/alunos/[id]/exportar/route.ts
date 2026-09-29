import { exportarDadosDoAluno } from "@/lib/admin/alunos";
import { registrarAuditoria } from "@/lib/admin/auditoria";
import { requireArea } from "@/lib/admin/sessao";

// Exportação LGPD dos dados do aluno (JSON). Suporte ou administrador geral;
// cada exportação fica na auditoria.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sessao = await requireArea("alunos");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Aluno inválido", { status: 400 });
  if (!sessao.funcoes.some((f) => f === "geral" || f === "suporte")) {
    await registrarAuditoria({ adminId: sessao.userId, acao: "aluno.exportar_dados", entidade: "aluno", entidadeId: id, resultado: "negado" });
    return new Response("Sua função não permite exportar dados de alunos.", { status: 403 });
  }
  const dados = await exportarDadosDoAluno(sessao.userId, id);
  if (!dados) return new Response("Aluno não encontrado", { status: 404 });
  return new Response(JSON.stringify(dados, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="dados-aluno-${id.slice(0, 8)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
