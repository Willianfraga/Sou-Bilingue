import Anthropic from "@anthropic-ai/sdk";
import { VERSAO_PROMPT_PROFESSOR, buildSystemPrompt } from "@/lib/ai/tutor";
import { registrarFalaDoAluno, registrarRespostaDoTutor } from "@/lib/ai/conversas";
import { getSessao } from "@/lib/auth/guards";
import { getPerfilDoAluno } from "@/lib/data/alunos";
import { getTutorPorId } from "@/lib/data/tutores";
import { formatarMemorias, getMemoriasDoAluno, salvarMemoriasDaFala } from "@/lib/ai/memory";
import { recordAIUsage, resumoDoErro } from "@/lib/ai/usage";
import { getOnboardingDoAluno } from "@/lib/data/onboarding";
import { buildStudentContext, nomeParaOTutor } from "@/lib/onboarding/contexto";
import { onboardingConcluido } from "@/lib/onboarding/fluxo";
import { bloqueioDeAula } from "@/lib/billing/acesso";

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

  // Aula só depois da entrevista de boas-vindas (mesma regra do layout de /aluno).
  const onboarding = await getOnboardingDoAluno(sessao.userId);
  if (!onboardingConcluido(onboarding)) {
    return Response.json(
      { erro: "Conclua a entrevista de boas-vindas antes da primeira aula.", destino: "/boas-vindas" },
      { status: 403 },
    );
  }

  const bloqueio = await bloqueioDeAula(sessao.userId, "aulaChat");
  if (bloqueio) return bloqueio;

  const { mensagens, tema } = (await request.json()) as {
    mensagens: MensagemCliente[];
    tema?: unknown;
  };

  if (!Array.isArray(mensagens) || mensagens.length === 0) {
    return new Response("Nenhuma mensagem enviada.", { status: 400 });
  }

  const tutor = await getTutorPorId(perfil.tutorId);
  const temaLivre = typeof tema === "string" ? tema.trim().slice(0, 180) : undefined;
  const ultimaFala = [...mensagens].reverse().find((mensagem) => mensagem.role === "user")?.content ?? "";
  await salvarMemoriasDaFala(sessao.userId, ultimaFala);
  const memorias = await getMemoriasDoAluno(sessao.userId);
  // Contexto permanente do aluno: montado só por buildStudentContext.
  const systemPrompt = buildSystemPrompt(
    perfil,
    tutor?.nome ?? "Tutor",
    nomeParaOTutor(onboarding?.respostas, sessao.nome),
    formatarMemorias(memorias),
    temaLivre,
    buildStudentContext(onboarding?.respostas),
  );

  // Conversa guardada por 90 dias (docs/admin-painel.md, /privacidade).
  const registro = ultimaFala.trim()
    ? await registrarFalaDoAluno({ alunoId: sessao.userId, tutorId: tutor?.id ?? null, idioma: perfil.idioma ?? null, texto: ultimaFala })
    : null;
  const modelo = process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5-20251001";
  const inicio = Date.now();

  try {
    const resposta = await client.messages.create({
      model: modelo,
      max_tokens: 1024,
      system: [
        {
          type: "text",
          text: systemPrompt,
          cache_control: { type: "ephemeral" },
        },
      ],
      // Segundo ponto de cache na última mensagem: o histórico inteiro entra
      // no cache e a próxima fala só paga os tokens novos. Sozinho, o prompt
      // do sistema fica abaixo do mínimo cacheável do Haiku 4.5 (4.096
      // tokens) e o cache nunca acontecia — ver docs/CUSTOS_IA.md.
      messages: mensagens.map((m, i): Anthropic.MessageParam =>
        i === mensagens.length - 1
          ? { role: m.role, content: [{ type: "text", text: m.content, cache_control: { type: "ephemeral" } }] }
          : { role: m.role, content: m.content },
      ),
    });

    const texto = resposta.content
      .filter((bloco) => bloco.type === "text")
      .map((bloco) => bloco.text)
      .join("");

    const latenciaMs = Date.now() - inicio;
    const mensagemId = registro
      ? await registrarRespostaDoTutor({
          conversaId: registro.conversaId,
          alunoId: sessao.userId,
          texto,
          status: "ok",
          modelo: resposta.model,
          versaoPrompt: VERSAO_PROMPT_PROFESSOR,
          latenciaMs,
        })
      : null;
    const usage = resposta.usage;
    await recordAIUsage({
      alunoId: sessao.userId,
      provider: "anthropic",
      service: "llm",
      model: resposta.model,
      inputTokens: usage.input_tokens,
      outputTokens: usage.output_tokens,
      cacheCreationTokens: usage.cache_creation_input_tokens ?? 0,
      cacheReadTokens: usage.cache_read_input_tokens ?? 0,
      tutorId: tutor?.id ?? null,
      conversaId: registro?.conversaId ?? null,
      mensagemId,
      latenciaMs,
    });

    return new Response(texto, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (erro) {
    // Falha também entra na conta: aparece no painel (taxa de erro por
    // provedor/tutor) sem expor dados pessoais.
    const resumo = resumoDoErro(erro);
    const latenciaMs = Date.now() - inicio;
    const mensagemId = registro
      ? await registrarRespostaDoTutor({ conversaId: registro.conversaId, alunoId: sessao.userId, texto: null, status: "erro", erro: resumo, modelo, versaoPrompt: VERSAO_PROMPT_PROFESSOR, latenciaMs })
      : null;
    await recordAIUsage({
      alunoId: sessao.userId, provider: "anthropic", service: "llm", model: modelo,
      tutorId: tutor?.id ?? null, conversaId: registro?.conversaId ?? null, mensagemId,
      latenciaMs, status: "erro", erro: resumo,
    });
    console.error("Falha na API do tutor:", resumo);
    return Response.json(
      { erro: "O tutor está temporariamente indisponível." },
      { status: 502 },
    );
  }
}
