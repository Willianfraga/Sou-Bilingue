import { registrarEventoFunil } from "@/lib/data/vendas";
import { ipDoCliente, limitar, respostaLimiteExcedido } from "@/lib/seguranca/limite";
import { extrairCampanha, eventoPermitido, limparParametro } from "@/lib/vendas/rastreio";

// Eventos do funil vindos do navegador (página de vendas). Público, sem
// login, sem dados pessoais. "compra_confirmada" é recusado aqui: só o
// webhook de pagamento grava conversão.
export async function POST(request: Request) {
  const limite = limitar(`eventos:${ipDoCliente(request.headers)}`, 60, 60_000);
  if (!limite.permitido) return respostaLimiteExcedido(limite.tenteEmSegundos);

  const corpo = await request.json().catch(() => null);
  if (!corpo || !eventoPermitido(corpo.nome) || corpo.nome === "compra_confirmada") {
    return Response.json({ ok: false }, { status: 400 });
  }

  await registrarEventoFunil({
    nome: corpo.nome,
    sessao: limparParametro(corpo.sessao),
    pagina: typeof corpo.pagina === "string" && corpo.pagina.startsWith("/") ? corpo.pagina.slice(0, 120) : undefined,
    plano: limparParametro(corpo.plano),
    campanha: extrairCampanha(corpo.campanha && typeof corpo.campanha === "object" ? corpo.campanha : {}),
  });
  return Response.json({ ok: true });
}
