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

  const { mensagens } = (await request.json()) as {
    mensagens: MensagemCliente[];
  };

  if (!Array.isArray(mensagens) || mensagens.length === 0) {
    return new Response("Nenhuma mensagem enviada.", { status: 400 });
  }

  const tutor = await getTutorPorId(perfil.tutorId);
  const systemPrompt = buildSystemPrompt(perfil, tutor?.nome ?? "Tutor");

  const stream = client.messages.stream({
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

  const encoder = new TextEncoder();
  const readable = new ReadableStream<Uint8Array>({
    start(controller) {
      stream.on("text", (delta) => {
        controller.enqueue(encoder.encode(delta));
      });
      stream.on("end", () => controller.close());
      stream.on("error", (erro) => controller.error(erro));
    },
    cancel() {
      stream.abort();
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
