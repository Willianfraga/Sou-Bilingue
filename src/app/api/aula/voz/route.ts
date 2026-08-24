import { getSessao } from "@/lib/auth/guards";
import { getPerfilDoAluno } from "@/lib/data/alunos";
import { sintetizarVoz } from "@/lib/voice/elevenlabs";
import { recordAIUsage } from "@/lib/ai/usage";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const sessao = await getSessao();
  if (!sessao || sessao.papel !== "aluno") {
    return Response.json({ erro: "Não autenticado." }, { status: 401 });
  }

  const perfil = await getPerfilDoAluno(sessao.userId);
  if (!perfil) {
    return Response.json({ erro: "Perfil do aluno não encontrado." }, { status: 404 });
  }

  const corpo = (await request.json().catch(() => null)) as { texto?: unknown } | null;
  const texto = typeof corpo?.texto === "string" ? corpo.texto.trim() : "";
  if (!texto || texto.length > 1_500) {
    return Response.json({ erro: "Texto inválido para sintetização." }, { status: 400 });
  }

  try {
    const audio = await sintetizarVoz({ texto, tutorId: perfil.tutorId });
    await recordAIUsage({
      alunoId: sessao.userId,
      provider: "elevenlabs",
      service: "tts",
      model: "eleven_flash_v2_5",
      characters: Array.from(texto).length,
    });
    return new Response(audio, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (erro) {
    console.error("Falha ao sintetizar voz do tutor:", erro);
    return Response.json({ erro: "A voz premium está temporariamente indisponível." }, { status: 502 });
  }
}
