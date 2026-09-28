// Conteúdo editável da página de vendas. Módulo puro: tipos, textos padrão e
// validação — usado pela página, pela área administrativa e pelos testes.
//
// Regras (docs/sales-page.md):
// - Nada aqui promete o que o produto não entrega (sem "grátis", sem
//   garantia, sem números inventados). Depoimentos começam vazios: a seção só
//   aparece quando o administrador cadastrar depoimentos reais.
// - Todo texto é renderizado como texto (React escapa) — nunca como HTML.
// - Preços e horas NÃO ficam aqui: vêm da tabela planos.

export type Pergunta = { pergunta: string; resposta: string };
export type Depoimento = { nome: string; contexto: string; texto: string };

export type ConteudoVendas = {
  variante: string; // rótulo para futuros testes A/B (ex.: "a", "b")
  heroSelo: string;
  heroTitulo: string;
  heroDestaque: string; // trecho do título com gradiente
  heroSubtitulo: string;
  ctaPrincipal: string;
  ctaSecundario: string;
  ctaPlanos: string;
  ctaFinal: string;
  avisoPromocional: string; // faixa no topo; vazio = sem faixa
  suporteEmail: string; // vazio = sem link de e-mail
  suporteWhatsapp: string; // só dígitos com DDI; vazio = sem link
  perguntas: Pergunta[];
  depoimentos: Depoimento[];
  videoAula: string; // link do YouTube/Vimeo de uma aula real; vazio = demonstração animada
  seoTitulo: string;
  seoDescricao: string;
};

export const CONTEUDO_PADRAO: ConteudoVendas = {
  variante: "a",
  heroSelo: "Professor de idiomas com inteligência artificial",
  heroTitulo: "Fale um novo idioma",
  heroDestaque: "com confiança",
  heroSubtitulo:
    "Converse por voz com um professor virtual paciente, que conhece seus objetivos e seus interesses. Pratique no seu ritmo, erre sem medo e acompanhe sua evolução.",
  ctaPrincipal: "Começar minha jornada",
  ctaSecundario: "Ver como funciona",
  ctaPlanos: "Conhecer os planos",
  ctaFinal: "Começar minha primeira aula",
  avisoPromocional: "",
  suporteEmail: "",
  suporteWhatsapp: "",
  perguntas: [
    {
      pergunta: "Tenho vergonha de falar. Isso é para mim?",
      resposta:
        "Sim. Você conversa a sós com o professor virtual, sem plateia. Ele é orientado a corrigir com gentileza, reconhecer o que você acertou e nunca constranger por causa de um erro.",
    },
    {
      pergunta: "Meu nível é muito baixo. Consigo acompanhar?",
      resposta:
        "Consegue. A conversa começa em português e o idioma entra aos poucos — primeiro palavras e frases curtas, depois perguntas simples. O ritmo acompanha o nível que você informa na entrevista inicial.",
    },
    {
      pergunta: "Não tenho tempo. Como encaixo na rotina?",
      resposta:
        "As aulas acontecem quando você quiser, a qualquer hora, direto no navegador. Dá para praticar em sessões curtas; na entrevista inicial você informa quanto tempo tem e o professor ajusta o tamanho das atividades.",
    },
    {
      pergunta: "Uma IA consegue mesmo me ensinar?",
      resposta:
        "Ela é excelente para o que mais falta a quem estuda sozinho: conversar muito, com correções no momento certo e sem julgamento. Ela não faz milagre — a evolução depende da sua prática. Por isso o app acompanha sua constância semana a semana.",
    },
    {
      pergunta: "As aulas vão combinar com meus objetivos?",
      resposta:
        "Antes da primeira aula você responde uma entrevista curta sobre objetivos, interesses, situações em que vai usar o idioma e como prefere ser corrigido. O professor usa essas respostas em todas as aulas, e você pode editá-las quando quiser.",
    },
    {
      pergunta: "Funciona no celular?",
      resposta:
        "Funciona no navegador do celular e do computador, sem instalar nada. Para conversar por voz, basta permitir o uso do microfone.",
    },
    {
      pergunta: "Como funciona o pagamento?",
      resposta:
        "O pagamento é feito na página segura do Asaas (Pix, cartão ou boleto). O Sou Bilíngue não recebe nem guarda dados do seu cartão. O acesso é liberado assim que o pagamento é confirmado.",
    },
    {
      pergunta: "Posso cancelar?",
      resposta:
        "Sim, quando quiser e pelo próprio app, em Minha assinatura — sem precisar falar com ninguém. As próximas cobranças são canceladas na hora e você continua com acesso até o fim do período que já pagou.",
    },
    {
      pergunta: "Meus dados estão seguros?",
      resposta:
        "Pedimos só o necessário para as aulas. Cada aluno acessa apenas os próprios dados, e as preferências da entrevista servem só para personalizar as aulas. Detalhes na Política de Privacidade.",
    },
  ],
  depoimentos: [],
  videoAula: "",
  seoTitulo: "Sou Bilíngue — aulas de idiomas por conversa com professor de IA",
  seoDescricao:
    "Aprenda inglês, espanhol, francês, italiano ou mandarim conversando por voz com um professor virtual paciente, que adapta cada aula ao seu nível e aos seus interesses.",
};

// ---------- validação / higienização (servidor) ----------

const LIMITES: Record<string, number> = {
  variante: 20,
  heroSelo: 80,
  heroTitulo: 60,
  heroDestaque: 40,
  heroSubtitulo: 320,
  ctaPrincipal: 40,
  ctaSecundario: 40,
  ctaPlanos: 40,
  ctaFinal: 40,
  avisoPromocional: 140,
  suporteEmail: 120,
  suporteWhatsapp: 30, // aceita formatação; só os dígitos são guardados
  seoTitulo: 70,
  seoDescricao: 170,
  videoAula: 200,
};

// Link de vídeo → player incorporado. Só YouTube (modo sem cookies) e Vimeo;
// qualquer outro endereço é recusado (nada de iframe de origem arbitrária).
export type VideoIncorporado = { plataforma: "youtube" | "vimeo"; id: string; embed: string; capa?: string };

export function videoIncorporado(url: string): VideoIncorporado | null {
  let u: URL;
  try {
    u = new URL(url.trim());
  } catch {
    return null;
  }
  if (u.protocol !== "https:") return null;
  const host = u.hostname.replace(/^www\.|^m\./, "");
  let id: string | null = null;
  if (host === "youtu.be") id = u.pathname.slice(1).split("/")[0];
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    id = u.searchParams.get("v") ?? u.pathname.match(/^\/(?:shorts|embed|live)\/([^/]+)/)?.[1] ?? null;
  } else if (host === "vimeo.com" || host === "player.vimeo.com") {
    const vimeo = u.pathname.match(/(?:\/video)?\/(\d{6,12})(?:\/|$)/)?.[1];
    return vimeo ? { plataforma: "vimeo", id: vimeo, embed: `https://player.vimeo.com/video/${vimeo}?dnt=1&autoplay=1` } : null;
  }
  if (!id || !/^[A-Za-z0-9_-]{11}$/.test(id)) return null;
  return {
    plataforma: "youtube",
    id,
    embed: `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`,
    capa: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
  };
}

function texto(valor: unknown, max: number): string {
  if (typeof valor !== "string") return "";
  return valor.replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, "").replace(/[<>]/g, "").trim().slice(0, max);
}

export function emailValido(email: string): boolean {
  return email === "" || /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email);
}

// ---------- listas em texto simples (formulário do admin) ----------
// Perguntas: blocos separados por linha em branco; 1ª linha = pergunta,
// o resto = resposta. Depoimentos: 1ª linha "Nome | contexto", resto = texto.

const blocos = (texto: string) =>
  texto.replace(/\r\n/g, "\n").split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);

export function perguntasParaTexto(perguntas: Pergunta[]): string {
  return perguntas.map((p) => `${p.pergunta}\n${p.resposta}`).join("\n\n");
}

export function textoParaPerguntas(texto: string): Pergunta[] {
  return blocos(texto).map((b) => {
    const [pergunta, ...resto] = b.split("\n");
    return { pergunta: pergunta.trim(), resposta: resto.join(" ").trim() };
  });
}

export function depoimentosParaTexto(depoimentos: Depoimento[]): string {
  return depoimentos.map((d) => `${d.nome}${d.contexto ? ` | ${d.contexto}` : ""}\n${d.texto}`).join("\n\n");
}

export function textoParaDepoimentos(texto: string): Depoimento[] {
  return blocos(texto).map((b) => {
    const [cabecalho, ...resto] = b.split("\n");
    const [nome, contexto = ""] = cabecalho.split("|").map((s) => s.trim());
    return { nome, contexto, texto: resto.join(" ").trim() };
  });
}

// Depoimento enviado pelo aluno (formulário do perfil). Mesmos limites da
// tabela depoimentos (migration 0017).
export type ResultadoDepoimento =
  | { ok: true; dados: { nome_exibicao: string; contexto: string; texto: string } }
  | { ok: false; erro: string };

export function validarDepoimentoDoAluno(entrada: {
  nome: unknown;
  contexto: unknown;
  texto: unknown;
  autorizo: unknown;
}): ResultadoDepoimento {
  if (entrada.autorizo !== "sim") return { ok: false, erro: "Marque a autorização para podermos publicar." };
  const nome = texto(entrada.nome, 60);
  const contexto = texto(entrada.contexto, 80);
  const corpo = texto(entrada.texto, 500);
  if (nome.length < 2) return { ok: false, erro: "Diga como quer aparecer (pelo menos 2 letras)." };
  if (corpo.length < 20) return { ok: false, erro: "Escreva pelo menos uma frase (20 caracteres)." };
  return { ok: true, dados: { nome_exibicao: nome, contexto, texto: corpo } };
}

// Valida e completa o conteúdo vindo do banco ou do formulário. Campo
// inválido volta ao padrão (página nunca quebra por conteúdo ruim).
export function normalizarConteudo(entrada: unknown): ConteudoVendas {
  const e = entrada && typeof entrada === "object" ? (entrada as Record<string, unknown>) : {};
  const r = { ...CONTEUDO_PADRAO };

  for (const [campo, max] of Object.entries(LIMITES)) {
    if (e[campo] === undefined) continue;
    (r as Record<string, unknown>)[campo] = texto(e[campo], max);
  }
  for (const obrigatorio of ["heroTitulo", "heroSubtitulo", "ctaPrincipal", "ctaSecundario", "ctaPlanos", "ctaFinal", "seoTitulo", "seoDescricao"] as const) {
    if (!r[obrigatorio]) r[obrigatorio] = CONTEUDO_PADRAO[obrigatorio];
  }
  if (!emailValido(r.suporteEmail)) r.suporteEmail = "";
  if (r.videoAula && !videoIncorporado(r.videoAula)) r.videoAula = "";
  r.suporteWhatsapp = r.suporteWhatsapp.replace(/\D/g, "");
  if (r.suporteWhatsapp && (r.suporteWhatsapp.length < 10 || r.suporteWhatsapp.length > 15)) r.suporteWhatsapp = "";

  if (Array.isArray(e.perguntas)) {
    r.perguntas = e.perguntas
      .map((p) => ({ pergunta: texto((p as Pergunta)?.pergunta, 160), resposta: texto((p as Pergunta)?.resposta, 800) }))
      .filter((p) => p.pergunta && p.resposta)
      .slice(0, 20);
  }
  if (Array.isArray(e.depoimentos)) {
    r.depoimentos = e.depoimentos
      .map((d) => ({
        nome: texto((d as Depoimento)?.nome, 60),
        contexto: texto((d as Depoimento)?.contexto, 80),
        texto: texto((d as Depoimento)?.texto, 500),
      }))
      .filter((d) => d.nome && d.texto)
      .slice(0, 12);
  }
  return r;
}
