"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { registrarAuditoria } from "@/lib/admin/auditoria";
import { requireArea } from "@/lib/admin/sessao";
import { anotarReembolso, decidirReembolso, reprocessarReembolso } from "@/lib/billing/reembolso";

// Toda decisão manual grava admin (da sessão), data e justificativa em
// reembolso_eventos. O id vem do formulário, mas só identifica o pedido.
export async function agirNoReembolso(formData: FormData) {
  const sessao = await requireArea("reembolsos");
  const id = String(formData.get("id") ?? "");
  const acao = formData.get("acao");
  const texto = String(formData.get("texto") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) redirect("/admin/reembolsos?erro=Pedido inválido");

  const r =
    acao === "aprovar" || acao === "negar"
      ? await decidirReembolso(id, acao, sessao.userId, texto)
      : acao === "reprocessar"
        ? await reprocessarReembolso(id, sessao.userId, texto)
        : acao === "anotar"
          ? await anotarReembolso(id, sessao.userId, texto)
          : { ok: false as const, erro: "Ação inválida." };

  await registrarAuditoria({
    adminId: sessao.userId,
    acao: `reembolso.${String(acao).slice(0, 20)}`,
    entidade: "reembolso",
    entidadeId: id,
    motivo: texto,
    resultado: r.ok ? "ok" : "erro",
    depois: r.ok ? undefined : { erro: r.erro },
  });
  revalidatePath("/admin/reembolsos");
  redirect(r.ok ? "/admin/reembolsos?ok=1" : `/admin/reembolsos?erro=${encodeURIComponent(r.erro)}`);
}
