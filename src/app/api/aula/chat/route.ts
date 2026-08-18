import Anthropic from "@anthropic-ai/sdk";
import { buildSystemPrompt } from "@/lib/ai/tutor";
import { getTutorPorNome } from "@/lib/data/tutores";
import { getPerfilDoAlunoMock, NOME_DO_TUTOR_MOCK } from "@/lib/mock/perfil";

export const runtime = "nodejs";

// Lê ANTHROPIC_API_KEY do ambiente — a chave nunca chega ao browser (mesma
// regra do projeto "academia flow": segredo só existe no servidor).
const client = new Anthropic();

type MensagemCliente = { role: "user" | "assistant"; content: string };

export async function POST(request: Request) {
  const { mensagens } = (await request.json()) as {
    mensagens: MensagemCliente[];
  };

  if (!Array.isArray(mensagens) || mensagens.length === 0) {
    return new Response("Nenhuma mensagem enviada.", { status: 400 });
  }

  // O contexto do aluno (idioma, sotaque, tutor, objetivo) vem do perfil no
  // servidor — nunca do que o cliente manda no corpo da requisição. O perfil
  // em si ainda é mock (src/lib/mock/perfil.ts) — sem cadastro real — mas o
  // tutor já vem do banco de verdade. Quando existir sessão de verdade, troca
  // o perfil também por uma consulta ao banco pelo id do aluno autenticado.
  const perfil = getPerfilDoAlunoMock();
  const tutor = await getTutorPorNome(NOME_DO_TUTOR_MOCK);

  const stream = client.messages.stream({
    model: "claude-opus-5",
    max_tokens: 1024,
    system: buildSystemPrompt(perfil, tutor?.nome ?? "Tutor"),
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
