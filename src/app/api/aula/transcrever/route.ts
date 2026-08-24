import { getSessao } from "@/lib/auth/guards";
import { getPerfilDoAluno } from "@/lib/data/alunos";

export const runtime = "nodejs";

const CODIGO_DO_IDIOMA = {
  ingles: "en",
  espanhol: "es",
  frances: "fr",
  italiano: "it",
  mandarim: "zh",
} as const;

export async function POST(request: Request) {
  const sessao = await getSessao();
  if (!sessao || sessao.papel !== "aluno") {
    return Response.json({ erro: "Não autenticado." }, { status: 401 });
  }

  const perfil = await getPerfilDoAluno(sessao.userId);
  if (!perfil) {
    return Response.json({ erro: "Perfil do aluno não encontrado." }, { status: 404 });
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return Response.json({ erro: "Serviço de transcrição não configurado." }, { status: 503 });
  }

  const recebido = await request.formData();
  const audio = recebido.get("audio");
  if (!(audio instanceof File) || audio.size < 100 || audio.size > 12 * 1024 * 1024) {
    return Response.json({ erro: "Áudio inválido." }, { status: 400 });
  }

  const formulario = new FormData();
  formulario.append("file", audio, audio.name || "resposta.webm");
  formulario.append("model_id", "scribe_v2");
  formulario.append("language_code", CODIGO_DO_IDIOMA[perfil.idioma]);
  formulario.append("tag_audio_events", "false");
  formulario.append("num_speakers", "1");

  try {
    const resposta = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: { "xi-api-key": apiKey },
      body: formulario,
      signal: AbortSignal.timeout(25_000),
    });
    const dados = (await resposta.json().catch(() => null)) as { text?: string } | null;
    if (!resposta.ok) {
      console.error("Falha na transcrição ElevenLabs:", resposta.status);
      return Response.json({ erro: "Não foi possível transcrever o áudio." }, { status: 502 });
    }
    return Response.json({ texto: dados?.text?.trim() ?? "" });
  } catch (erro) {
    console.error("Falha ao transcrever voz:", erro);
    return Response.json({ erro: "A transcrição está temporariamente indisponível." }, { status: 502 });
  }
}
