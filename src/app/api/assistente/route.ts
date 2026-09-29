import Anthropic from "@anthropic-ai/sdk";
import { getPlanos } from "@/lib/billing/subscription";
import { recordAIUsage, resumoDoErro } from "@/lib/ai/usage";
import { getConteudoVendas } from "@/lib/data/vendas";
import { ipDoCliente, limitar } from "@/lib/seguranca/limite";
import { LIMITES_ASSISTENTE, montarPromptDoAssistente, validarConversa } from "@/lib/vendas/assistente";

// Assistente de dúvidas das páginas de venda — público (sem login), então:
// limite por IP, teto diário do app, corpo pequeno, resposta curta e nenhuma
// ferramenta (ele só conversa). Nada do que o visitante escreve é gravado;
// o log guarda só a contagem de tokens. Conhecimento: src/lib/vendas/assistente.ts.

const client = new Anthropic({ timeout: 25_000, maxRetries: 1 });
const DIA_MS = 24 * 60 * 60_000;

export async function POST(request: Request) {
  const conteudo = await getConteudoVendas();
  if (!conteudo.assistenteAtivo) return Response.json({ erro: "Assistente desligado." }, { status: 404 });

  const ip = ipDoCliente(request.headers);
  const porIp = limitar(`assistente:${ip}`, LIMITES_ASSISTENTE.porIp.maximo, LIMITES_ASSISTENTE.porIp.janelaMs);
  if (!porIp.permitido) {
    return Response.json(
      { erro: "Muitas perguntas seguidas. Espere alguns minutos e tente de novo." },
      { status: 429, headers: { "Retry-After": String(porIp.tenteEmSegundos) } },
    );
  }
  const teto = Number(process.env.ASSISTENTE_LIMITE_DIARIO) || LIMITES_ASSISTENTE.diarioPadrao;
  if (!limitar("assistente:app", teto, DIA_MS).permitido) {
    return Response.json({ erro: "O assistente atingiu o limite de hoje." }, { status: 503 });
  }

  const bruto = await request.text();
  if (bruto.length > 40_000) return Response.json({ erro: "Conversa longa demais." }, { status: 413 });
  let corpo: unknown;
  try {
    corpo = JSON.parse(bruto);
  } catch {
    return Response.json({ erro: "JSON inválido." }, { status: 400 });
  }
  const conversa = validarConversa(corpo);
  if (!conversa.ok) return Response.json({ erro: conversa.erro }, { status: 400 });

  const planos = (await getPlanos()).map((p) => ({ nome: p.nome, preco: Number(p.preco), horas: Number(p.horas_mensais) }));
  const sistema = montarPromptDoAssistente({ planos, conteudo, pagina: conversa.pagina });

  const modelo = process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5-20251001";
  const inicio = Date.now();
  try {
    const resposta = await client.messages.create({
      model: modelo,
      max_tokens: LIMITES_ASSISTENTE.respostaTokens,
      system: [{ type: "text", text: sistema, cache_control: { type: "ephemeral" } }],
      messages: conversa.mensagens.map((m) => ({ role: m.papel === "cliente" ? ("user" as const) : ("assistant" as const), content: m.texto })),
    });
    const texto = resposta.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    // Custo do assistente entra no painel (origem "assistente_vendas", sem
    // aluno e sem o texto da conversa).
    await recordAIUsage({
      alunoId: null, provider: "anthropic", service: "llm", model: resposta.model, origem: "assistente_vendas",
      inputTokens: resposta.usage.input_tokens, outputTokens: resposta.usage.output_tokens,
      cacheCreationTokens: resposta.usage.cache_creation_input_tokens ?? 0, cacheReadTokens: resposta.usage.cache_read_input_tokens ?? 0,
      latenciaMs: Date.now() - inicio, metadata: { pagina: conversa.pagina },
    });
    if (!texto) return Response.json({ erro: "indisponivel" }, { status: 503 });
    return Response.json({ resposta: texto });
  } catch (e) {
    await recordAIUsage({
      alunoId: null, provider: "anthropic", service: "llm", model: modelo, origem: "assistente_vendas",
      latenciaMs: Date.now() - inicio, status: "erro", erro: resumoDoErro(e), metadata: { pagina: conversa.pagina },
    });
    console.error("Falha no assistente:", resumoDoErro(e));
    return Response.json({ erro: "indisponivel" }, { status: 503 });
  }
}
