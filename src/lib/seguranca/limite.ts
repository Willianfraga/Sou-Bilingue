// Limite de requisições por janela de tempo (rate limiting), em memória.
// Suficiente para o app hoje: um único container no Coolify. Limitações
// (docs/payment-security.md): zera quando o container reinicia e não é
// compartilhado entre instâncias — se o app escalar para mais de uma
// instância, trocar por um contador no banco ou no Redis.
//
// Módulo puro (sem Next), testado em test/seguranca.test.mjs.

type Janela = { inicio: number; contagem: number };

const janelas = new Map<string, Janela>();
let ultimaLimpeza = 0;

export type ResultadoLimite = { permitido: true } | { permitido: false; tenteEmSegundos: number };

export function limitar(chave: string, maximo: number, janelaMs: number, agora = Date.now()): ResultadoLimite {
  // Limpeza preguiçosa para o mapa não crescer para sempre.
  if (agora - ultimaLimpeza > 60_000) {
    for (const [k, j] of janelas) if (agora - j.inicio > janelaMs * 2) janelas.delete(k);
    ultimaLimpeza = agora;
  }

  const atual = janelas.get(chave);
  if (!atual || agora - atual.inicio >= janelaMs) {
    janelas.set(chave, { inicio: agora, contagem: 1 });
    return { permitido: true };
  }
  if (atual.contagem >= maximo) {
    return { permitido: false, tenteEmSegundos: Math.ceil((atual.inicio + janelaMs - agora) / 1000) };
  }
  atual.contagem += 1;
  return { permitido: true };
}

export function _zerarLimites() {
  janelas.clear();
}

// Regras por rota. Chave = rota + usuário (ou IP quando não há login).
export const LIMITES = {
  aulaChat: { maximo: 30, janelaMs: 60_000 },
  aulaVoz: { maximo: 40, janelaMs: 60_000 },
  aulaTranscricao: { maximo: 40, janelaMs: 60_000 },
  onboarding: { maximo: 60, janelaMs: 60_000 },
  cadastro: { maximo: 10, janelaMs: 10 * 60_000 },
  recuperarSenha: { maximo: 5, janelaMs: 15 * 60_000 },
} as const;

// IP do cliente atrás do Traefik (Coolify): o proxy acrescenta o IP real no
// fim de X-Forwarded-For; o começo pode ser forjado pelo próprio cliente.
export function ipDoCliente(headers: Headers): string {
  const cadeia = headers.get("x-forwarded-for");
  if (cadeia) {
    const partes = cadeia.split(",").map((p) => p.trim()).filter(Boolean);
    if (partes.length) return partes[partes.length - 1];
  }
  return headers.get("x-real-ip") ?? "desconhecido";
}

export function respostaLimiteExcedido(tenteEmSegundos: number) {
  return Response.json(
    { erro: "Muitas tentativas em pouco tempo. Aguarde um instante e tente de novo." },
    { status: 429, headers: { "Retry-After": String(tenteEmSegundos) } },
  );
}
