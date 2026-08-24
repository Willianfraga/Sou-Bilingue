import { NextResponse } from "next/server";
import { getSessao } from "@/lib/auth/guards";

const TAVUS_API_URL = "https://tavusapi.com/v2";

export async function POST() {
  const sessao = await getSessao();
  if (!sessao || sessao.papel !== "aluno") {
    return NextResponse.json({ erro: "Acesso não autorizado." }, { status: 401 });
  }

  const apiKey = process.env.TAVUS_API_KEY;
  const personaId = process.env.TAVUS_PERSONA_ID;
  const replicaId = process.env.TAVUS_REPLICA_ID;
  if (!apiKey || !personaId || !replicaId) {
    return NextResponse.json({ erro: "A videochamada realista ainda está sendo configurada." }, { status: 503 });
  }

  try {
    const resposta = await fetch(`${TAVUS_API_URL}/conversations`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey },
      body: JSON.stringify({
        persona_id: personaId,
        replica_id: replicaId,
        conversation_name: `Aula Sou Bilíngue — ${sessao.nome}`,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    const dados = (await resposta.json()) as { conversation_id?: string; conversation_url?: string; message?: string };
    if (!resposta.ok || !dados.conversation_id || !dados.conversation_url) {
      console.error("Falha Tavus", resposta.status, dados.message);
      return NextResponse.json({ erro: "Não foi possível preparar a videochamada agora." }, { status: 502 });
    }
    if (!dados.conversation_url.startsWith("https://tavus.daily.co/")) {
      return NextResponse.json({ erro: "A plataforma de vídeo retornou um endereço inválido." }, { status: 502 });
    }
    return NextResponse.json({ conversationId: dados.conversation_id, conversationUrl: dados.conversation_url });
  } catch (erro) {
    console.error("Erro ao criar conversa Tavus", erro);
    return NextResponse.json({ erro: "A plataforma de vídeo demorou para responder." }, { status: 504 });
  }
}
