"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { anonimizarAluno, concederReposicao, reativarAluno, suspenderAluno } from "@/lib/admin/alunos";
import { registrarAuditoria } from "@/lib/admin/auditoria";
import { requireArea } from "@/lib/admin/sessao";

const UUID = /^[0-9a-f-]{36}$/i;

// Quem pode o quê dentro de Alunos: suspender/reativar/conceder horas =
// suporte ou geral; anonimizar (irreversível) = só administrador geral.
export async function agirNoAluno(formData: FormData) {
  const sessao = await requireArea("alunos");
  const id = String(formData.get("id") ?? "");
  const acao = String(formData.get("acao") ?? "");
  const motivo = String(formData.get("motivo") ?? "");
  if (!UUID.test(id)) redirect("/admin/alunos");
  const destino = `/admin/alunos/${id}`;

  const pode =
    acao === "anonimizar" ? sessao.funcoes.includes("geral") : acao === "suspender" || acao === "reativar" || acao === "conceder_horas" ? sessao.funcoes.some((f) => f === "geral" || f === "suporte") : false;
  if (!pode) {
    await registrarAuditoria({ adminId: sessao.userId, acao: `aluno.${acao.slice(0, 20)}`, entidade: "aluno", entidadeId: id, resultado: "negado" });
    redirect(`${destino}?erro=${encodeURIComponent("Sua função não permite esta ação.")}`);
  }

  const r =
    acao === "suspender"
      ? await suspenderAluno(sessao.userId, id, motivo)
      : acao === "reativar"
        ? await reativarAluno(sessao.userId, id, motivo)
        : acao === "conceder_horas"
          ? await concederReposicao(sessao.userId, id, Number(String(formData.get("horas") ?? "").replace(",", ".")), motivo)
          : await anonimizarAluno(sessao.userId, id, motivo, String(formData.get("confirmacao") ?? ""));

  revalidatePath(destino);
  revalidatePath("/admin/alunos");
  redirect(r.ok ? `${destino}?ok=${acao}` : `${destino}?erro=${encodeURIComponent(r.erro)}`);
}
