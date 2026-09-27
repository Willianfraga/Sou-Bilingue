import { createSupabaseServerClient } from "@/lib/supabase/server";

// Lido com a sessão do usuário: a policy de RLS já libera tutores para
// qualquer usuário autenticado, então o service role não é necessário aqui.
export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return Response.json(
        { success: false, error: "Faça login para escolher seu tutor." },
        { status: 401 },
      );
    }

    // select("*") mantém a rota funcionando antes e depois da migration 0011.
    const { data, error } = await supabase.from("tutores").select("*");

    if (error) {
      console.error("Erro ao buscar tutores:", error.message);
      return Response.json(
        { success: false, error: "Não foi possível listar os tutores." },
        { status: 500 },
      );
    }

    const ORDEM_FAIXA: Record<string, number> = { crianca: 0, jovem: 1, adulto: 2 };
    const tutores = (data ?? [])
      .filter((t) => t.ativo !== false)
      .map((t) => ({
        id: t.id as string,
        nome: t.nome as string,
        descricao: t.descricao as string,
        foto_url: (t.foto_url as string | null) ?? null,
        faixa_etaria: (t.faixa_etaria as string | null) ?? null,
        genero: (t.genero as string | null) ?? null,
      }))
      .sort(
        (a, b) =>
          (ORDEM_FAIXA[a.faixa_etaria ?? ""] ?? 9) - (ORDEM_FAIXA[b.faixa_etaria ?? ""] ?? 9) ||
          (a.genero ?? "").localeCompare(b.genero ?? "") ||
          a.nome.localeCompare(b.nome),
      );

    return Response.json({ success: true, tutores });
  } catch (error) {
    console.error("Erro no endpoint de tutores:", error instanceof Error ? error.message : error);
    return Response.json(
      { success: false, error: "Não foi possível listar os tutores." },
      { status: 500 },
    );
  }
}
