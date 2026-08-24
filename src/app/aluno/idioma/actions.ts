"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSessao } from "@/lib/auth/guards";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Idioma } from "@/lib/types";

const SOTAQUE_PADRAO: Record<Idioma, string> = {
  ingles: "Americano",
  espanhol: "Espanha",
  frances: "França",
  mandarim: "China continental",
  italiano: "Padrão",
};

const IDIOMAS = Object.keys(SOTAQUE_PADRAO) as Idioma[];

export async function alterarIdioma(formData: FormData) {
  const sessao = await requireSessao();
  if (sessao.papel !== "aluno") redirect("/");

  const idioma = String(formData.get("idioma") ?? "") as Idioma;
  if (!IDIOMAS.includes(idioma)) throw new Error("Idioma não suportado.");

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("alunos")
    .update({ idioma, sotaque: SOTAQUE_PADRAO[idioma] })
    .eq("id", sessao.userId);

  if (error) throw new Error("Não foi possível alterar o idioma agora.");

  revalidatePath("/aluno", "layout");
  const destino = String(formData.get("destino") ?? "/aluno/licoes");
  redirect(destino === "/aluno/aula" ? destino : "/aluno/licoes");
}
