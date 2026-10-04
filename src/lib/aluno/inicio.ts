// Tela inicial do aluno (menu bento + tutor + "Iniciar minha aula").
// Módulo puro, testado em test/inicio-aluno.test.mjs. A personalização vem
// das respostas da entrevista de boas-vindas (15 perguntas).

import { PREFIRO_NAO_RESPONDER, rotuloDaOpcao, type Respostas } from "@/lib/onboarding/questionario";
import { nomeParaOTutor } from "@/lib/onboarding/contexto";

export type ItemMenu = { href: string; rotulo: string; icone: string; descricao: string };

// Atalhos do menu bento (grade). A aula começa pelo botão grande da tela inicial.
export const ITENS_DO_MENU: ItemMenu[] = [
  { href: "/aluno/horas", rotulo: "Minhas horas", icone: "⏱️", descricao: "Saldo de horas de conversa" },
  { href: "/aluno/tutor", rotulo: "Meu tutor", icone: "🧑‍🏫", descricao: "Trocar de professor" },
  { href: "/aluno/progresso", rotulo: "Meu progresso", icone: "📈", descricao: "Metas da semana e do mês" },
  { href: "/aluno/licoes", rotulo: "Minhas lições", icone: "📚", descricao: "Temas e trilhas" },
  { href: "/aluno/licoes#escolher-idioma", rotulo: "Meu idioma", icone: "🌎", descricao: "Idioma e sotaque" },
  { href: "/aluno/certificados", rotulo: "Certificados", icone: "🏅", descricao: "Certificados do mês" },
  { href: "/aluno/perfil#preferencias", rotulo: "Preferências", icone: "🧭", descricao: "Respostas da entrevista" },
  { href: "/aluno/perfil", rotulo: "Meu perfil", icone: "👤", descricao: "Dados e depoimento" },
  { href: "/assinatura", rotulo: "Assinatura", icone: "💳", descricao: "Plano, cancelamento e reembolso" },
];

const util = (v: unknown): v is string => typeof v === "string" && v.trim() !== "" && v !== PREFIRO_NAO_RESPONDER;

export type ResumoDaEntrevista = {
  nome: string;
  idioma: string | null;
  nivel: string | null;
  objetivo: string | null;
  temaDoDia: string | null;
};

// Escolhe um tema de conversa da entrevista; muda a cada dia (estável no mesmo dia).
export function temaDoDia(respostas: Respostas | null | undefined, hoje = new Date()): string | null {
  const temas = Array.isArray(respostas?.temasConversa) ? respostas!.temasConversa.filter(util) : [];
  if (!temas.length) return null;
  const dia = Math.floor(hoje.getTime() / 86_400_000);
  return rotuloDaOpcao("temasConversa", temas[dia % temas.length]);
}

export function resumirEntrevista(respostas: Respostas | null | undefined, nomeDoCadastro: string, hoje = new Date()): ResumoDaEntrevista {
  const primeiroNome = (nome: string) => nome.trim().split(/\s+/)[0] || nome;
  const idioma = util(respostas?.idiomaAlvo) ? rotuloDaOpcao("idiomaAlvo", respostas!.idiomaAlvo as string) : null;
  const nivel = util(respostas?.nivel) ? rotuloDaOpcao("nivel", respostas!.nivel as string).split(" — ")[0] : null;
  const objetivos = Array.isArray(respostas?.objetivos) ? respostas!.objetivos.filter(util) : [];
  return {
    nome: primeiroNome(nomeParaOTutor(respostas, nomeDoCadastro)),
    idioma,
    nivel,
    objetivo: objetivos.length ? rotuloDaOpcao("objetivos", objetivos[0]) : null,
    temaDoDia: temaDoDia(respostas, hoje),
  };
}

// Relógio da sessão de aula: 12:34 ou 1:02:45 (função pura, testada).
export function relogio(segundos: number): string {
  const s = Math.max(0, Math.floor(segundos));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${String(m).padStart(2, "0")}:${ss}`;
}
