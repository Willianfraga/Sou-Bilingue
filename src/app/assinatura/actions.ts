"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePapel } from "@/lib/auth/guards";
import { cancelarAssinaturaDoAluno } from "@/lib/billing/cancelamento";
import { limitar } from "@/lib/seguranca/limite";

// O aluno vem da sessão; o formulário só manda o motivo e a confirmação.
export async function cancelarMinhaAssinatura(formData: FormData) {
  const sessao = await requirePapel("aluno");
  if (formData.get("confirmo") !== "sim") redirect("/assinatura?erro=confirmacao");
  if (!limitar(`cancelar:${sessao.userId}`, 5, 10 * 60_000).permitido) redirect("/assinatura?erro=tentativas");

  const r = await cancelarAssinaturaDoAluno(sessao.userId, formData.get("motivo"));
  revalidatePath("/aluno", "layout");
  redirect(r.ok ? "/assinatura?cancelada=1" : "/assinatura?erro=falha");
}
