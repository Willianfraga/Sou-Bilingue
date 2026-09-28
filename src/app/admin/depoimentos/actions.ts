"use server";

import { revalidatePath } from "next/cache";
import { requirePapel } from "@/lib/auth/guards";
import { moderarDepoimento } from "@/lib/data/depoimentos";

export async function moderar(formData: FormData) {
  const sessao = await requirePapel("admin");
  const id = String(formData.get("id") ?? "");
  const decisao = formData.get("decisao");
  if (!/^[0-9a-f-]{36}$/i.test(id) || (decisao !== "aprovado" && decisao !== "recusado")) return;
  await moderarDepoimento(id, decisao, sessao.userId);
  revalidatePath("/admin/depoimentos");
  revalidatePath("/");
}
