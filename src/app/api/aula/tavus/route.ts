import { NextResponse } from "next/server";
import { getSessao } from "@/lib/auth/guards";

const TAVUS_API_URL = "https://tavusapi.com/v2";

export async function POST() {
  if (process.env.TAVUS_ENABLED !== "true") {
    return NextResponse.json({ erro: "Videochamada Tavus desativada." }, { status: 503 });
  }
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
        properties: {
          participant_absent_timeout: 60,
          participant_left_timeout: 10,
        },
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

export async function DELETE(request: Request) {
  if (process.env.TAVUS_ENABLED !== "true") {
    return NextResponse.json({ encerrada: true });
  }
  const sessao = await getSessao();
  if (!sessao || sessao.papel !== "aluno") {
    return NextResponse.json({ erro: "Acesso não autorizado." }, { status: 401 });
  }
  const apiKey = process.env.TAVUS_API_KEY;
  if (!apiKey) return NextResponse.json({ erro: "Tavus não configurado." }, { status: 503 });
  const corpo = (await request.json().catch(() => null)) as { conversationId?: string } | null;
  const conversationId = corpo?.conversationId;
  if (!conversationId || !/^c[a-zA-Z0-9_-]{6,80}$/.test(conversationId)) {
    return NextResponse.json({ erro: "Conversa inválida." }, { status: 400 });
  }
  try {
    await fetch(`${TAVUS_API_URL}/conversations/${encodeURIComponent(conversationId)}/end`, {
      method: "POST",
      headers: { "x-api-key": apiKey },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    return NextResponse.json({ encerrada: true });
  } catch (erro) {
    console.error("Erro ao encerrar conversa Tavus", erro);
    return NextResponse.json({ erro: "Não foi possível confirmar o encerramento." }, { status: 502 });
  }
}
