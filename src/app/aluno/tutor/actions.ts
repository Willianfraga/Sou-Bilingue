"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSessao } from "@/lib/auth/guards";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function alterarTutor(formData: FormData) {
  const sessao = await requireSessao();
  if (sessao.papel !== "aluno") redirect("/");

  const tutorId = String(formData.get("tutorId") ?? "");
  const supabase = createSupabaseAdminClient();
  const { data: tutor } = await supabase.from("tutores").select("id").eq("id", tutorId).maybeSingle();
  if (!tutor) throw new Error("Tutor não encontrado.");

  const { error } = await supabase.from("alunos").update({ tutor_id: tutorId }).eq("id", sessao.userId);
  if (error) throw new Error("Não foi possível trocar o tutor.");

  revalidatePath("/aluno", "layout");
  redirect("/aluno/aula");
}
