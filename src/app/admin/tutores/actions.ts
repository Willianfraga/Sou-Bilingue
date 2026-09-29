"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { registrarAuditoria } from "@/lib/admin/auditoria";
import { requireArea } from "@/lib/admin/sessao";
import { atualizarTutor } from "@/lib/admin/tutores";

// Editar tutor: administrador geral ou pedagógico. Status diferente de
// "ativo" tira o tutor da escolha dos alunos (tutores.ativo); quem já usa
// continua até trocar — a tela avisa quantos são.
export async function salvarTutor(formData: FormData) {
  const sessao = await requireArea("tutores");
  const id = String(formData.get("id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) redirect("/admin/tutores");
  if (!sessao.funcoes.some((f) => f === "geral" || f === "pedagogico")) {
    await registrarAuditoria({ adminId: sessao.userId, acao: "tutor.editar", entidade: "tutor", entidadeId: id, resultado: "negado" });
    redirect(`/admin/tutores/${id}?erro=${encodeURIComponent("Sua função não permite editar tutores.")}`);
  }
  const r = await atualizarTutor(sessao.userId, id, {
    nome: formData.get("nome"),
    descricao: formData.get("descricao"),
    status: formData.get("status"),
    motivo: formData.get("motivo"),
  });
  revalidatePath("/admin/tutores");
  revalidatePath(`/admin/tutores/${id}`);
  redirect(r.ok ? `/admin/tutores/${id}?ok=1` : `/admin/tutores/${id}?erro=${encodeURIComponent(r.erro)}`);
}
