// Fatos do produto usados na página de vendas E pelo assistente de dúvidas
// (src/lib/vendas/assistente.ts). Uma fonte só: o assistente nunca diz algo
// diferente do que a página mostra. Só o que o app realmente faz — ver
// docs/sales-page.md (sem promessas falsas). Preços e horas: tabela planos.

export const TUTORES = [
  { nome: "Clara", foto: "/tutores/anime/clara.png", perfil: "Adulta, calorosa" },
  { nome: "Seu Antônio", foto: "/tutores/anime/antonio.png", perfil: "Sereno, bem-humorado" },
  { nome: "Mei", foto: "/tutores/anime/mei.png", perfil: "Jovem, leve" },
  { nome: "Diego", foto: "/tutores/anime/diego.png", perfil: "Jovem, comunicativo" },
  { nome: "Luna", foto: "/tutores/anime/luna.png", perfil: "Para crianças" },
  { nome: "Theo", foto: "/tutores/anime/theo.png", perfil: "Para crianças" },
];

export const OBJECOES = [
  { dor: "Tenho vergonha de falar.", resposta: "Aqui não tem plateia: é você e um professor paciente, que nunca te constrange por errar." },
  { dor: "Não tenho tempo.", resposta: "A aula acontece quando você puder, a qualquer hora, em sessões do tamanho da sua rotina." },
  { dor: "Já tentei outros apps e não evoluí.", resposta: "Exercício solto não ensina a conversar. Aqui você fala de verdade, sobre o que gosta." },
  { dor: "Meu nível é muito baixo.", resposta: "A conversa começa em português e o idioma entra aos poucos, no seu ritmo." },
  { dor: "Não sei por onde começar.", resposta: "Uma entrevista curta monta seu perfil e o professor sugere o primeiro assunto." },
  { dor: "Não consigo manter a rotina.", resposta: "Metas semanais e um certificado mensal verificável ajudam a manter a constância." },
];

export const BENEFICIOS = [
  { icone: "🎯", titulo: "Aulas sobre o que você gosta", texto: "Viagens, games, trabalho, séries: os exemplos saem dos seus interesses." },
  { icone: "🗣️", titulo: "Conversação de verdade", texto: "Você fala por voz e ouve as respostas — pratica pronúncia e escuta ao mesmo tempo." },
  { icone: "🤝", titulo: "Correção respeitosa", texto: "Na hora, no fim da frase ou só no final: você escolhe como quer ser corrigido." },
  { icone: "🛟", titulo: "Seguro para errar", texto: "Travou? Vem uma pista ou duas opções. Errar faz parte e é tratado assim." },
  { icone: "⏱️", titulo: "No seu horário", texto: "Sem agenda fixa: pratique de manhã, no almoço ou à noite, no celular ou no computador." },
  { icone: "📈", titulo: "Evolução acompanhada", texto: "Horas praticadas, constância semanal e dificuldade que sobe aos poucos." },
  { icone: "🏅", titulo: "Certificado mensal", texto: "Cumpriu a meta de todas as semanas do mês? Ganha um certificado com código de verificação." },
  { icone: "➕", titulo: "Aulas extras quando quiser", texto: "Precisa praticar mais num mês? Compre aulas extras direto no app." },
];

export const COMPARACAO: Array<{ item: string; sb: string; curso: string; app: string }> = [
  { item: "Horário", sb: "Quando você quiser", curso: "Turma com horário fixo", app: "Quando você quiser" },
  { item: "Conversa por voz", sb: "Em toda aula", curso: "Divide o tempo com a turma", app: "Pouca ou nenhuma" },
  { item: "Assuntos da aula", sb: "Seus interesses e objetivos", curso: "Apostila da turma", app: "Trilha igual para todos" },
  { item: "Jeito de corrigir", sb: "Você escolhe", curso: "Depende do professor", app: "Certo ou errado" },
  { item: "Falar sem plateia", sb: "Sim", curso: "Não", app: "Sim" },
  { item: "Professor humano", sb: "Não — professor virtual", curso: "Sim", app: "Não" },
];


// Fluxo real do produto, em 6 passos clicáveis (abas acessíveis por teclado).
export const PASSOS = [
  {
    titulo: "Você conta quem é",
    texto:
      "Uma entrevista curta de boas-vindas: como prefere ser chamado, seu nível, objetivos, assuntos favoritos e como gosta de ser corrigido. Nada de dados desnecessários.",
    detalhe: "15 perguntas, uma por vez, com opção \"Prefiro não responder\".",
  },
  {
    titulo: "Seu perfil é montado",
    texto:
      "As respostas viram um perfil de aprendizagem que acompanha todas as aulas. Você pode editar quando quiser.",
    detalhe: "Nível, interesses, temas a evitar e preferência de correção.",
  },
  {
    titulo: "A conversa começa no seu nível",
    texto:
      "O professor virtual começa em português e traz o idioma aos poucos. Uma pergunta por vez, em frases curtas, sobre assuntos de que você gosta.",
    detalhe: "Você escolhe o tema — ou deixa o professor escolher.",
  },
  {
    titulo: "Ajuda e correção na hora certa",
    texto:
      "Travou? Ele dá uma pista, oferece opções ou mostra um exemplo. Errou? Ele corrige com gentileza, do jeito que você pediu.",
    detalhe: "Prioriza o erro que atrapalha a comunicação, sem lista de erros.",
  },
  {
    titulo: "Seu progresso fica registrado",
    texto:
      "O app acompanha suas horas e sua constância. Cumpriu a meta de todas as semanas do mês? Você recebe um certificado mensal verificável.",
    detalhe: "Certificado com código público de verificação.",
  },
  {
    titulo: "As próximas aulas se adaptam",
    texto:
      "O professor lembra do que você compartilhou e aumenta a dificuldade aos poucos, conforme você acerta.",
    detalhe: "Sem repetir a mesma atividade seguida.",
  },
];
