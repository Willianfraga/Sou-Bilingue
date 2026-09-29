"use server";

import { revalidatePath } from "next/cache";
import { registrarAuditoria } from "@/lib/admin/auditoria";
import { requireArea } from "@/lib/admin/sessao";
import { moderarDepoimento } from "@/lib/data/depoimentos";

export async function moderar(formData: FormData) {
  const sessao = await requireArea("depoimentos");
  const id = String(formData.get("id") ?? "");
  const decisao = formData.get("decisao");
  if (!/^[0-9a-f-]{36}$/i.test(id) || (decisao !== "aprovado" && decisao !== "recusado")) return;
  await moderarDepoimento(id, decisao, sessao.userId);
  await registrarAuditoria({ adminId: sessao.userId, acao: `depoimento.${decisao}`, entidade: "depoimento", entidadeId: id, depois: { status: decisao }, resultado: "ok" });
  revalidatePath("/admin/depoimentos");
  revalidatePath("/");
}
