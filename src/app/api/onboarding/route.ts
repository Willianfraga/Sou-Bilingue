import { getSessao } from "@/lib/auth/guards";
import { getPerfilDoAluno } from "@/lib/data/alunos";
import {
  concluirOnboarding,
  getOnboardingDoAluno,
  salvarRascunhoDoOnboarding,
  sincronizarIdiomaDoAluno,
} from "@/lib/data/onboarding";
import { ROTA_PRIMEIRA_AULA } from "@/lib/onboarding/fluxo";
import { validarRespostas } from "@/lib/onboarding/questionario";
import type { Idioma } from "@/lib/types";
import { LIMITES, limitar, respostaLimiteExcedido } from "@/lib/seguranca/limite";

// Entrevista de boas-vindas. O aluno vem sempre da sessão — o corpo da
// requisição só traz respostas, nunca "de quem" elas são. Nenhum log aqui
// inclui o conteúdo das respostas.

async function alunoDaSessao() {
  const sessao = await getSessao();
  if (!sessao || sessao.papel !== "aluno") return { erro: erro(401, "Faça login como aluno para continuar.") };
  const limite = limitar(`onboarding:${sessao.userId}`, LIMITES.onboarding.maximo, LIMITES.onboarding.janelaMs);
  if (!limite.permitido) return { erro: respostaLimiteExcedido(limite.tenteEmSegundos) };
  const perfil = await getPerfilDoAluno(sessao.userId);
  if (!perfil) return { erro: erro(409, "Conclua o cadastro antes da entrevista.") };
  return { sessao, perfil };
}

function erro(status: number, mensagem: string, extra?: Record<string, unknown>) {
  return Response.json({ success: false, error: mensagem, ...extra }, { status });
}

export async function GET() {
  const r = await alunoDaSessao();
  if ("erro" in r) return r.erro;
  const estado = await getOnboardingDoAluno(r.sessao.userId);
  return Response.json({
    success: true,
    concluido: Boolean(estado?.concluidoEm),
    concluidoEm: estado?.concluidoEm ?? null,
    respostas: estado?.respostas ?? {},
    rascunho: estado?.rascunho ?? {},
    etapa: estado?.etapaAtual ?? 0,
  });
}

// Rascunho: aceita respostas parciais e descarta o que não passar na
// validação — salvar progresso nunca bloqueia o aluno.
export async function PUT(request: Request) {
  const r = await alunoDaSessao();
  if ("erro" in r) return r.erro;

  const body = await request.json().catch(() => null);
  const { respostas } = validarRespostas(body?.rascunho, false);
  const ok = await salvarRascunhoDoOnboarding(r.sessao.userId, respostas, Number(body?.etapa ?? 0));
  if (!ok) return erro(500, "Não foi possível salvar seu progresso agora.");
  return Response.json({ success: true });
}

// Conclusão: valida tudo de novo no servidor, grava e libera as aulas.
export async function POST(request: Request) {
  const r = await alunoDaSessao();
  if ("erro" in r) return r.erro;

  const body = await request.json().catch(() => null);
  const { respostas, erros } = validarRespostas(body?.respostas, true);
  if (Object.keys(erros).length > 0) {
    return erro(400, "Algumas respostas precisam de ajuste.", { erros });
  }

  const ok = await concluirOnboarding(r.sessao.userId, respostas);
  if (!ok) return erro(500, "Não foi possível salvar suas respostas agora.");

  if (typeof respostas.idiomaAlvo === "string") {
    await sincronizarIdiomaDoAluno(r.sessao.userId, r.perfil.idioma, respostas.idiomaAlvo as Idioma);
  }

  return Response.json({ success: true, destino: ROTA_PRIMEIRA_AULA });
}
