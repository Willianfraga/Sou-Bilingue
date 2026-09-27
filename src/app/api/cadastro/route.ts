import { getUsuarioAutenticado } from "@/lib/auth/guards";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const nome = String(body?.nome ?? "").trim();

    if (nome.length < 2 || nome.length > 120) {
      return Response.json(
        { success: false, error: "Informe um nome entre 2 e 120 caracteres." },
        { status: 400 },
      );
    }

    // O ID vem da sessão; o corpo da requisição nunca decide quem é o usuário.
    const user = await getUsuarioAutenticado();
    if (!user) {
      return Response.json(
        { success: false, error: "Sua sessão não foi encontrada. Faça login para continuar." },
        { status: 401 },
      );
    }

    // Não há policy de INSERT em profiles; a escrita passa pelo service role,
    // restrita ao próprio user.id.
    const supabase = createSupabaseAdminClient();

    const { data: existente, error: erroBusca } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (erroBusca) {
      console.error("Erro ao consultar profile:", erroBusca.message);
      return Response.json(
        { success: false, error: "Não foi possível criar o perfil agora." },
        { status: 500 },
      );
    }

    if (existente) {
      return Response.json({ success: true });
    }

    const { error } = await supabase
      .from("profiles")
      .insert({ id: user.id, papel: "aluno", nome });

    if (error) {
      console.error("Erro ao criar profile do aluno:", error.message);
      return Response.json(
        { success: false, error: "Não foi possível criar o perfil do aluno." },
        { status: 500 },
      );
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("Erro no endpoint de cadastro:", error instanceof Error ? error.message : error);
    return Response.json(
      { success: false, error: "Não foi possível completar o cadastro." },
      { status: 500 },
    );
  }
}
