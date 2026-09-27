import { getSessao } from "@/lib/auth/guards";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const nome = String(body?.nome ?? "").trim();

    if (!nome || nome.length < 2) {
      return Response.json(
        { success: false, error: "Nome deve ter pelo menos 2 caracteres." },
        { status: 400 },
      );
    }

    // SEGURANÇA: Determinar o usuário pela sessão autenticada, nunca confiar no corpo
    const sessao = await getSessao();
    if (!sessao) {
      return Response.json(
        { success: false, error: "Não autenticado." },
        { status: 401 },
      );
    }

    // Verificar se o profile já existe (não duplicar)
    const supabase = await createSupabaseServerClient();
    const { data: profileExistente } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", sessao.userId)
      .single();

    if (profileExistente) {
      return Response.json(
        { success: false, error: "Perfil já existe para este usuário." },
        { status: 409 },
      );
    }

    // Criar profile apenas para o usuário autenticado
    const { error } = await supabase
      .from("profiles")
      .insert({
        id: sessao.userId,
        papel: "aluno",
        nome,
      });

    if (error) {
      console.error("Erro ao criar profile do aluno:", error);
      return Response.json(
        { success: false, error: "Não foi possível criar o perfil do aluno." },
        { status: 500 },
      );
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("Erro no endpoint de cadastro:", error);
    return Response.json(
      { success: false, error: "Não foi possível completar o cadastro." },
      { status: 500 },
    );
  }
}
