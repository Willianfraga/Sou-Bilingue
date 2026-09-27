// Entrevista de boas-vindas (onboarding pedagógico). Módulo puro — sem
// Supabase, sem React, sem alias "@/" — para ser usado igual no navegador,
// nas rotas do servidor e nos testes (node --test).
//
// Os textos ficam todos aqui, com chave estável por pergunta e por opção:
// uma futura tradução troca só os rótulos, nunca as chaves gravadas no banco.

export const VERSAO_QUESTIONARIO = 1;

// Resposta explícita de "não quero dizer" — diferente de "ainda não respondeu".
export const PREFIRO_NAO_RESPONDER = "prefiro_nao_responder";

export type TipoPergunta = "texto" | "unica" | "multipla" | "escala";

export type Opcao = { valor: string; rotulo: string };

export type Pergunta = {
  id: ChavePergunta;
  tipo: TipoPergunta;
  titulo: string;
  ajuda?: string;
  opcoes?: Opcao[];
  obrigatoria: boolean;
  // Pergunta pessoal: sempre oferece "Prefiro não responder".
  pessoal?: boolean;
  min?: number; // mínimo de opções (multipla)
  max?: number; // máximo de opções (multipla) ou de caracteres (texto)
  placeholder?: string;
};

export type ChavePergunta =
  | "nomePreferido"
  | "faixaEtaria"
  | "idiomaAlvo"
  | "nivel"
  | "motivacao"
  | "objetivos"
  | "temasConversa"
  | "hobbies"
  | "situacoesUso"
  | "habilidadesPrioritarias"
  | "dificuldades"
  | "estiloAprendizagem"
  | "preferenciaCorrecao"
  | "disponibilidadeEstudo"
  | "temasEvitados";

export type ValorResposta = string | string[];
export type Respostas = Partial<Record<ChavePergunta, ValorResposta>>;

const op = (valor: string, rotulo: string): Opcao => ({ valor, rotulo });

export const PERGUNTAS: Pergunta[] = [
  {
    id: "nomePreferido",
    tipo: "texto",
    titulo: "Para começar: como você prefere ser chamado?",
    ajuda: "Pode ser seu nome, um apelido ou como seus amigos te chamam.",
    obrigatoria: true,
    max: 40,
    placeholder: "Ex.: João, Jojo, Ju",
  },
  {
    id: "faixaEtaria",
    tipo: "unica",
    titulo: "Qual é a sua faixa de idade?",
    ajuda: "Assim eu escolho palavras e assuntos que combinam com você.",
    obrigatoria: true,
    pessoal: true,
    opcoes: [
      op("ate_12", "Até 12 anos"),
      op("13_17", "13 a 17 anos"),
      op("18_24", "18 a 24 anos"),
      op("25_39", "25 a 39 anos"),
      op("40_59", "40 a 59 anos"),
      op("60_mais", "60 anos ou mais"),
    ],
  },
  {
    id: "idiomaAlvo",
    tipo: "unica",
    titulo: "Qual idioma você está aprendendo comigo?",
    obrigatoria: true,
    opcoes: [
      op("ingles", "Inglês"),
      op("espanhol", "Espanhol"),
      op("frances", "Francês"),
      op("italiano", "Italiano"),
      op("mandarim", "Mandarim"),
    ],
  },
  {
    id: "nivel",
    tipo: "unica",
    titulo: "Como você descreveria seu nível hoje?",
    ajuda: "Sem pressão — isso só me ajuda a começar no ritmo certo.",
    obrigatoria: true,
    opcoes: [
      op("nunca_estudei", "Nunca estudei"),
      op("iniciante", "Iniciante — sei algumas palavras"),
      op("basico", "Básico — monto frases simples"),
      op("intermediario", "Intermediário — converso com alguma ajuda"),
      op("avancado", "Avançado — converso com tranquilidade"),
      op("nao_sei", "Não sei dizer"),
    ],
  },
  {
    id: "motivacao",
    tipo: "texto",
    titulo: "Por que você quer aprender esse idioma?",
    ajuda: "Conte do seu jeito, em uma ou duas frases.",
    obrigatoria: false,
    pessoal: true,
    max: 300,
    placeholder: "Ex.: Quero viajar sozinho sem depender de tradutor.",
  },
  {
    id: "objetivos",
    tipo: "multipla",
    titulo: "Quais são seus principais objetivos?",
    ajuda: "Escolha até 3.",
    obrigatoria: true,
    min: 1,
    max: 3,
    opcoes: [
      op("viajar", "Viajar"),
      op("trabalho", "Trabalho e carreira"),
      op("estudos", "Estudos ou intercâmbio"),
      op("provas", "Provas e certificados"),
      op("morar_fora", "Morar em outro país"),
      op("pessoas", "Conversar com amigos ou família"),
      op("cultura", "Filmes, séries, música e livros"),
      op("pessoal", "Desenvolvimento pessoal"),
    ],
  },
  {
    id: "temasConversa",
    tipo: "multipla",
    titulo: "Sobre quais assuntos você gosta de conversar?",
    ajuda: "Escolha até 5. Vou puxar conversa por aqui.",
    obrigatoria: true,
    min: 1,
    max: 5,
    opcoes: [
      op("viagens", "Viagens"),
      op("comida", "Comida"),
      op("musica", "Música"),
      op("filmes_series", "Filmes e séries"),
      op("esportes", "Esportes"),
      op("tecnologia", "Tecnologia"),
      op("games", "Games"),
      op("natureza", "Natureza e animais"),
      op("ciencia", "Ciência"),
      op("arte", "Arte e moda"),
      op("negocios", "Negócios"),
      op("cotidiano", "Dia a dia"),
    ],
  },
  {
    id: "hobbies",
    tipo: "texto",
    titulo: "O que você curte fazer no tempo livre?",
    ajuda: "Hobbies, interesses, coisas que te animam.",
    obrigatoria: false,
    pessoal: true,
    max: 200,
    placeholder: "Ex.: jogar futebol, cozinhar, desenhar",
  },
  {
    id: "situacoesUso",
    tipo: "multipla",
    titulo: "Em quais situações você pretende usar o idioma?",
    obrigatoria: true,
    min: 1,
    max: 8,
    opcoes: [
      op("viagens", "Em viagens"),
      op("reunioes", "Reuniões de trabalho"),
      op("entrevistas", "Entrevistas de emprego"),
      op("mensagens", "E-mails e mensagens"),
      op("escola", "Na escola ou faculdade"),
      op("internet", "Redes sociais e internet"),
      op("midia", "Assistir sem legenda"),
      op("estrangeiros", "Conversar com estrangeiros"),
    ],
  },
  {
    id: "habilidadesPrioritarias",
    tipo: "multipla",
    titulo: "Quais habilidades você quer desenvolver mais?",
    ajuda: "Escolha até 3.",
    obrigatoria: true,
    min: 1,
    max: 3,
    opcoes: [
      op("conversacao", "Conversação"),
      op("compreensao", "Compreensão (entender o que ouço)"),
      op("leitura", "Leitura"),
      op("escrita", "Escrita"),
      op("vocabulario", "Vocabulário"),
      op("gramatica", "Gramática"),
      op("pronuncia", "Pronúncia"),
    ],
  },
  {
    id: "dificuldades",
    tipo: "multipla",
    titulo: "O que mais te atrapalha hoje?",
    ajuda: "Escolha quantas quiser — ou pule se preferir.",
    obrigatoria: false,
    pessoal: true,
    min: 0,
    max: 8,
    opcoes: [
      op("vergonha", "Vergonha ou medo de errar"),
      op("entender_rapido", "Entender quando falam rápido"),
      op("pronuncia", "Pronúncia"),
      op("gramatica", "Gramática"),
      op("lembrar_palavras", "Lembrar das palavras"),
      op("montar_frases", "Montar frases"),
      op("tempo", "Falta de tempo"),
      op("constancia", "Manter a constância"),
    ],
  },
  {
    id: "estiloAprendizagem",
    tipo: "multipla",
    titulo: "Como você aprende melhor?",
    ajuda: "Pode combinar vários jeitos.",
    obrigatoria: true,
    min: 1,
    max: 6,
    opcoes: [
      op("conversas", "Conversando"),
      op("exemplos", "Com exemplos"),
      op("exercicios", "Com exercícios práticos"),
      op("historias", "Com histórias"),
      op("jogos", "Com jogos e desafios"),
      op("explicacoes", "Com explicações"),
    ],
  },
  {
    id: "preferenciaCorrecao",
    tipo: "unica",
    titulo: "Quando você errar, como prefere que eu corrija?",
    obrigatoria: true,
    opcoes: [
      op("na_hora", "Na hora, assim que eu errar"),
      op("fim_da_frase", "Depois que eu terminar a frase"),
      op("fim_da_conversa", "Só no fim da conversa"),
      op("so_importantes", "Só os erros mais importantes"),
    ],
  },
  {
    id: "disponibilidadeEstudo",
    tipo: "escala",
    titulo: "Quanto tempo por dia você quer praticar?",
    ajuda: "Toque no ponto da escala que mais combina com sua rotina.",
    obrigatoria: true,
    opcoes: [
      op("ate_15", "Até 15 min"),
      op("15_30", "15 a 30 min"),
      op("30_60", "30 a 60 min"),
      op("1_2h", "1 a 2 h"),
      op("mais_2h", "Mais de 2 h"),
    ],
  },
  {
    id: "temasEvitados",
    tipo: "texto",
    titulo: "Tem algum assunto que você prefere evitar nas aulas?",
    ajuda: "Eu respeito. Se não tiver nenhum, é só continuar.",
    obrigatoria: false,
    pessoal: true,
    max: 200,
    placeholder: "Ex.: política, religião",
  },
];

export function getPergunta(id: ChavePergunta): Pergunta {
  const pergunta = PERGUNTAS.find((p) => p.id === id);
  if (!pergunta) throw new Error(`Pergunta desconhecida: ${id}`);
  return pergunta;
}

export function rotuloDaOpcao(id: ChavePergunta, valor: string): string {
  if (valor === PREFIRO_NAO_RESPONDER) return "Prefiro não responder";
  return getPergunta(id).opcoes?.find((o) => o.valor === valor)?.rotulo ?? valor;
}

// ---------- validação (roda no navegador E no servidor) ----------

// Remove caracteres de controle e junta espaços; mantém acentos e pontuação.
export function limparTexto(texto: string): string {
  return texto
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export type ResultadoValidacao =
  | { ok: true; valor: ValorResposta | undefined }
  | { ok: false; erro: string };

export function validarResposta(pergunta: Pergunta, bruto: unknown): ResultadoValidacao {
  const vazio =
    bruto === undefined ||
    bruto === null ||
    (typeof bruto === "string" && limparTexto(bruto) === "") ||
    (Array.isArray(bruto) && bruto.length === 0);

  if (vazio) {
    if (pergunta.obrigatoria) return { ok: false, erro: "Responda esta pergunta para continuar." };
    return { ok: true, valor: undefined };
  }

  if (bruto === PREFIRO_NAO_RESPONDER) {
    if (pergunta.pessoal) return { ok: true, valor: PREFIRO_NAO_RESPONDER };
    return { ok: false, erro: "Esta pergunta precisa de uma resposta." };
  }

  if (pergunta.tipo === "texto") {
    if (typeof bruto !== "string") return { ok: false, erro: "Resposta em formato inválido." };
    const texto = limparTexto(bruto);
    const max = pergunta.max ?? 200;
    if (texto.length > max) return { ok: false, erro: `Use no máximo ${max} caracteres.` };
    if (pergunta.id === "nomePreferido" && texto.length < 2) {
      return { ok: false, erro: "Escreva pelo menos 2 letras." };
    }
    return { ok: true, valor: texto };
  }

  const permitidas = new Set((pergunta.opcoes ?? []).map((o) => o.valor));

  if (pergunta.tipo === "unica" || pergunta.tipo === "escala") {
    if (typeof bruto !== "string" || !permitidas.has(bruto)) {
      return { ok: false, erro: "Escolha uma das opções." };
    }
    return { ok: true, valor: bruto };
  }

  // multipla
  if (!Array.isArray(bruto) || bruto.some((v) => typeof v !== "string" || !permitidas.has(v))) {
    return { ok: false, erro: "Escolha apenas opções da lista." };
  }
  const unicos = [...new Set(bruto as string[])];
  const min = pergunta.min ?? 1;
  const max = pergunta.max ?? unicos.length;
  if (unicos.length < min) return { ok: false, erro: `Escolha pelo menos ${min}.` };
  if (unicos.length > max) return { ok: false, erro: `Escolha no máximo ${max}.` };
  return { ok: true, valor: unicos };
}

export type ResultadoRespostas = {
  respostas: Respostas;
  erros: Partial<Record<ChavePergunta, string>>;
};

// completo = true exige todas as obrigatórias (conclusão).
// completo = false (rascunho) descarta silenciosamente o que for inválido e
// aceita obrigatórias em branco — o rascunho nunca bloqueia o aluno.
export function validarRespostas(entrada: unknown, completo: boolean): ResultadoRespostas {
  const objeto =
    entrada && typeof entrada === "object" && !Array.isArray(entrada)
      ? (entrada as Record<string, unknown>)
      : {};
  const respostas: Respostas = {};
  const erros: Partial<Record<ChavePergunta, string>> = {};

  for (const pergunta of PERGUNTAS) {
    const resultado = validarResposta(pergunta, objeto[pergunta.id]);
    if (resultado.ok) {
      if (resultado.valor !== undefined) respostas[pergunta.id] = resultado.valor;
    } else if (completo) {
      erros[pergunta.id] = resultado.erro;
    }
  }
  return { respostas, erros };
}

export function etapaValida(etapa: unknown): number {
  const n = typeof etapa === "number" ? Math.trunc(etapa) : 0;
  // PERGUNTAS.length = tela de revisão
  return Math.min(Math.max(n, 0), PERGUNTAS.length);
}
