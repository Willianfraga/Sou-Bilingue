import { getUsuarioAutenticado } from "@/lib/auth/guards";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Idioma, Plano } from "@/lib/types";
import { LIMITES, ipDoCliente, limitar, respostaLimiteExcedido } from "@/lib/seguranca/limite";

const IDIOMAS_PERMITIDOS = new Set(["espanhol", "frances", "ingles", "mandarim", "italiano"]);
const PLANOS_PERMITIDOS = new Set(["basico", "intermediario", "avancado"]);

export async function POST(request: Request) {
  const limite = limitar(`cadastro:${ipDoCliente(request.headers)}`, LIMITES.cadastro.maximo, LIMITES.cadastro.janelaMs);
  if (!limite.permitido) return respostaLimiteExcedido(limite.tenteEmSegundos);

  try {
    const body = await request.json().catch(() => null);
    const idioma = String(body?.idioma ?? "") as Idioma;
    const plano = String(body?.plano ?? "") as Plano;
    const tutorId = String(body?.tutorId ?? "");
    const objetivo = String(body?.objetivo ?? "").trim().slice(0, 500);

    if (!IDIOMAS_PERMITIDOS.has(idioma) || !PLANOS_PERMITIDOS.has(plano) || !tutorId) {
      return Response.json(
        { success: false, error: "Escolha de idioma, plano ou tutor inválida." },
        { status: 400 },
      );
    }

    const user = await getUsuarioAutenticado();
    if (!user) {
      return Response.json(
        { success: false, error: "Sua sessão expirou. Faça login novamente." },
        { status: 401 },
      );
    }

    const supabase = createSupabaseAdminClient();

    const { data: profile } = await supabase
      .from("profiles")
      .select("papel")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile || profile.papel !== "aluno") {
      return Response.json(
        { success: false, error: "Esta conta não pode concluir o onboarding de aluno." },
        { status: 403 },
      );
    }

    const { data: tutor, error: tutorError } = await supabase
      .from("tutores")
      .select("*")
      .eq("id", tutorId)
      .maybeSingle();

    if (tutorError || !tutor || tutor.ativo === false) {
      return Response.json(
        { success: false, error: "Tutor informado não existe." },
        { status: 400 },
      );
    }

    const { error: alunoError } = await supabase.from("alunos").upsert(
      {
        id: user.id,
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
      console.error("Erro ao criar aluno:", alunoError.message);
      return Response.json(
        { success: false, error: "Não foi possível salvar o perfil do aluno." },
        { status: 500 },
      );
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("Erro no onboarding:", error instanceof Error ? error.message : error);
    return Response.json(
      { success: false, error: "Não foi possível concluir o onboarding." },
      { status: 500 },
    );
  }
}
