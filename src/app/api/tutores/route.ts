import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("tutores")
      .select("id, nome, descricao, foto_url")
      .order("nome", { ascending: true });

    if (error) {
      console.error("Erro ao buscar tutores:", error);
      return Response.json(
        { success: false, error: "Não foi possível listar os tutores." },
        { status: 500 },
      );
    }

    return Response.json({ success: true, tutores: data ?? [] });
  } catch (error) {
    console.error("Erro no endpoint de tutores:", error);
    return Response.json(
      { success: false, error: "Não foi possível listar os tutores." },
      { status: 500 },
    );
  }
}
