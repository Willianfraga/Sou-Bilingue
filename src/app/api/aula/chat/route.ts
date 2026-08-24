import Anthropic from "@anthropic-ai/sdk";
import { buildSystemPrompt } from "@/lib/ai/tutor";
import { getSessao } from "@/lib/auth/guards";
import { getPerfilDoAluno } from "@/lib/data/alunos";
import { getTutorPorId } from "@/lib/data/tutores";

export const runtime = "nodejs";

// Lê ANTHROPIC_API_KEY do ambiente — a chave nunca chega ao browser (mesma
// regra do projeto "academia flow": segredo só existe no servidor).
const client = new Anthropic();

type MensagemCliente = { role: "user" | "assistant"; content: string };

export async function POST(request: Request) {
  // O contexto do aluno vem da sessão no servidor — nunca do que o cliente
  // manda no corpo da requisição. Sem sessão de aluno, sem aula.
  const sessao = await getSessao();
  if (!sessao || sessao.papel !== "aluno") {
    return new Response("Não autenticado.", { status: 401 });
  }

  const perfil = await getPerfilDoAluno(sessao.userId);
  if (!perfil) {
    return new Response("Perfil do aluno não encontrado.", { status: 404 });
  }

  const { mensagens, tema } = (await request.json()) as {
    mensagens: MensagemCliente[];
    tema?: unknown;
  };

  if (!Array.isArray(mensagens) || mensagens.length === 0) {
    return new Response("Nenhuma mensagem enviada.", { status: 400 });
  }

  const tutor = await getTutorPorId(perfil.tutorId);
  const temaLivre = typeof tema === "string" ? tema.trim().slice(0, 180) : undefined;
  const systemPrompt = buildSystemPrompt(perfil, tutor?.nome ?? "Tutor", temaLivre);

  try {
    const resposta = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: [
        {
          type: "text",
          text: systemPrompt,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: mensagens.map((m) => ({ role: m.role, content: m.content })),
    });

    const texto = resposta.content
      .filter((bloco) => bloco.type === "text")
      .map((bloco) => bloco.text)
      .join("");

    return new Response(texto, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (erro) {
    console.error("Falha na API do tutor:", erro);
    return Response.json(
      { erro: "O tutor está temporariamente indisponível." },
      { status: 502 },
    );
  }
}
