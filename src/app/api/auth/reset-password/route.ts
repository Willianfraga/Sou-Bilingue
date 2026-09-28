import { createSupabaseServerClient } from "@/lib/supabase/server";
import { LIMITES, ipDoCliente, limitar, respostaLimiteExcedido } from "@/lib/seguranca/limite";

export async function POST(request: Request) {
  const limite = limitar(
    `recuperarSenha:${ipDoCliente(request.headers)}`,
    LIMITES.recuperarSenha.maximo,
    LIMITES.recuperarSenha.janelaMs,
  );
  if (!limite.permitido) return respostaLimiteExcedido(limite.tenteEmSegundos);

  try {
    const body = await request.json();
    const { token, password, passwordConfirm } = body;

    if (!token || !password || !passwordConfirm) {
      return Response.json(
        {
          success: false,
          error: "Token e nova senha são obrigatórios.",
        },
        { status: 400 },
      );
    }

    if (password !== passwordConfirm) {
      return Response.json(
        { success: false, error: "As senhas não correspondem." },
        { status: 400 },
      );
    }

    if (password.length < 6) {
      return Response.json(
        { success: false, error: "A senha deve ter pelo menos 6 caracteres." },
        { status: 400 },
      );
    }

    const supabase = await createSupabaseServerClient();

    // Supabase retorna sessão nova quando processamos o recovery token
    const { error: sessionError } = await supabase.auth.exchangeCodeForSession(
      token,
    );

    if (sessionError) {
      return Response.json(
        {
          success: false,
          error: "Link expirado ou inválido. Solicite um novo link de recuperação.",
        },
        { status: 401 },
      );
    }

    // Com a sessão válida, atualizar a senha
    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    if (updateError) {
      console.error("Erro ao atualizar senha:", updateError);
      return Response.json(
        {
          success: false,
          error: "Não foi possível trocar a senha. Tente novamente.",
        },
        { status: 500 },
      );
    }

    return Response.json({
      success: true,
      message: "Senha atualizada com sucesso. Você será redirecionado para o login.",
    });
  } catch (error) {
    console.error("Erro no endpoint de reset:", error);
    return Response.json(
      { success: false, error: "Erro ao processar recuperação." },
      { status: 500 },
    );
  }
}
