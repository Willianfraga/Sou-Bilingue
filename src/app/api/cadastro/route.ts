import { getUsuarioAutenticado } from "@/lib/auth/guards";
import { garantirProfileAluno, nomeValido } from "@/lib/auth/profile";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const nome = String(body?.nome ?? "").trim();

    if (!nomeValido(nome)) {
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

    if (!(await garantirProfileAluno(user.id, nome))) {
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
