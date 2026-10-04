"use server";

import { redirect } from "next/navigation";
import { requirePapel } from "@/lib/auth/guards";
import { comprarHorasExtras } from "@/lib/billing/topups";

// Compra de horas extras em "Minhas horas". A confirmação do pagamento só
// acontece pelo webhook do Asaas (nunca por uma ação chamada do navegador).
export async function comprarHorasExtrasAction(formData: FormData) {
  const sessao = await requirePapel("aluno");
  const r = await comprarHorasExtras({ id: sessao.userId, email: sessao.email, nome: sessao.nome }, Number(formData.get("horas")));
  if (!r.ok) redirect(`/aluno/horas?erro=${encodeURIComponent(r.erro)}`);
  redirect(r.checkoutUrl);
}
