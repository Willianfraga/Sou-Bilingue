import { canUseAI } from "@/lib/billing/subscription";
import { LIMITES, limitar, respostaLimiteExcedido } from "@/lib/seguranca/limite";

type RotaDeAula = "aulaChat" | "aulaVoz" | "aulaTranscricao";

// Barreira única das rotas que geram custo de IA (chat, voz, transcrição):
// limite de requisições + assinatura ativa com horas. Antes da Fase 0 essas
// rotas só exigiam login — qualquer conta de aluno, mesmo sem pagar, gerava
// custo chamando a API direto. Devolve a resposta de bloqueio, ou null.
export async function bloqueioDeAula(alunoId: string, rota: RotaDeAula): Promise<Response | null> {
  const { maximo, janelaMs } = LIMITES[rota];
  const limite = limitar(`${rota}:${alunoId}`, maximo, janelaMs);
  if (!limite.permitido) return respostaLimiteExcedido(limite.tenteEmSegundos);

  const acesso = await canUseAI(alunoId);
  if (!acesso.can) {
    const semHoras = acesso.error === "Sem horas disponíveis";
    return Response.json(
      {
        erro: semHoras
          ? "Suas horas deste ciclo acabaram. Você pode comprar horas extras para continuar."
          : "Você precisa de um plano ativo para conversar com o tutor.",
        destino: semHoras ? "/aluno/dashboard" : "/checkout",
      },
      { status: 402 },
    );
  }
  return null;
}
