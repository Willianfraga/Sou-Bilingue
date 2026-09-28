"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePapel } from "@/lib/auth/guards";
import { getPerfilDoAluno } from "@/lib/data/alunos";
import { enviarDepoimento, retirarDepoimento } from "@/lib/data/depoimentos";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { limitar } from "@/lib/seguranca/limite";
import { validarDepoimentoDoAluno } from "@/lib/vendas/conteudo";

export async function enviarMeuDepoimento(formData: FormData) {
  const sessao = await requirePapel("aluno");
  if (!limitar(`depoimento:${sessao.userId}`, 5, 10 * 60_000).permitido) redirect("/aluno/perfil?depoimento=tentativas#depoimento");

  // Só maiores de idade podem autorizar sozinhos a publicação (LGPD art. 14).
  const supabase = await createSupabaseServerClient();
  const { data: aluno } = await supabase.from("alunos").select("maior_de_idade").eq("id", sessao.userId).maybeSingle();
  if (!aluno?.maior_de_idade || !(await getPerfilDoAluno(sessao.userId))) redirect("/aluno/perfil?depoimento=menor#depoimento");

  const r = validarDepoimentoDoAluno({
    nome: formData.get("nome"),
    contexto: formData.get("contexto"),
    texto: formData.get("texto"),
    autorizo: formData.get("autorizo"),
  });
  if (!r.ok) redirect(`/aluno/perfil?depoimento=invalido&msg=${encodeURIComponent(r.erro)}#depoimento`);

  const ok = await enviarDepoimento(sessao.userId, r.dados);
  revalidatePath("/aluno/perfil");
  redirect(`/aluno/perfil?depoimento=${ok ? "enviado" : "falha"}#depoimento`);
}

export async function retirarMeuDepoimento() {
  const sessao = await requirePapel("aluno");
  await retirarDepoimento(sessao.userId);
  revalidatePath("/aluno/perfil");
  revalidatePath("/");
  redirect("/aluno/perfil?depoimento=retirado#depoimento");
}
