import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Idioma, Plano } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const userId = String(body?.userId ?? "");
    const idioma = String(body?.idioma ?? "") as Idioma;
    const plano = String(body?.plano ?? "") as Plano;
    const tutorId = String(body?.tutorId ?? "");
    const objetivo = String(body?.objetivo ?? "").trim();

    const idiomasPermitidos = new Set(["espanhol", "frances", "ingles", "mandarim", "italiano"]);
    const planosPermitidos = new Set(["basico", "intermediario", "avancado"]);

    if (!userId || !idiomasPermitidos.has(idioma) || !planosPermitidos.has(plano) || !tutorId) {
      return Response.json(
        { success: false, error: "Escolha de idioma, plano ou tutor inválida." },
        { status: 400 },
      );
    }

    const supabase = createSupabaseAdminClient();

    const { data: tutor, error: tutorError } = await supabase
      .from("tutores")
      .select("id")
      .eq("id", tutorId)
      .maybeSingle();

    if (tutorError || !tutor) {
      return Response.json(
        { success: false, error: "Tutor informado não existe." },
        { status: 400 },
      );
    }

    const { error: alunoError } = await supabase.from("alunos").upsert(
      {
        id: userId,
        responsavel_id: null,
        maior_de_idade: true,
        idioma,
        sotaque: "Padrão",
        plano,
        tutor_id: tutorId,
        objetivo_pessoal: objetivo || "Quero evoluir minhas conversas do dia a dia.",
      },
      { onConflict: "id" },
    );

    if (alunoError) {
      console.error("Erro ao criar aluno:", alunoError);
      return Response.json(
        { success: false, error: "Não foi possível salvar o perfil do aluno." },
        { status: 500 },
      );
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("Erro no onboarding:", error);
    return Response.json(
      { success: false, error: "Não foi possível concluir o onboarding." },
      { status: 500 },
    );
  }
}
