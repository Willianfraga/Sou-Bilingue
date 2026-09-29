// Áreas do painel e quem pode ver cada uma. Módulo puro (testado em
// test/admin.test.mjs), usado no servidor (requireArea) e no menu.
// "geral" vê tudo; as demais funções veem só o que a área lista.
// O banco confere de novo (app.tem_funcao, migration 0020).

export const FUNCOES_ADMIN = ["geral", "financeiro", "suporte", "pedagogico", "moderador", "analista"] as const;
export type FuncaoAdmin = (typeof FUNCOES_ADMIN)[number];

export const ROTULO_FUNCAO: Record<FuncaoAdmin, string> = {
  geral: "Administrador geral",
  financeiro: "Financeiro",
  suporte: "Suporte",
  pedagogico: "Pedagógico",
  moderador: "Moderador",
  analista: "Analista",
};

export type AreaAdmin = {
  id: string;
  rotulo: string;
  href: string;
  grupo: "Operação" | "Aprendizagem" | "Dinheiro" | "Cuidado" | "Página de vendas" | "Sistema";
  funcoes: FuncaoAdmin[]; // além de "geral"
  pronta: boolean; // false = aparece como "em breve" no menu
};

export const AREAS_ADMIN: AreaAdmin[] = [
  { id: "visao-geral", rotulo: "Visão geral", href: "/admin", grupo: "Operação", funcoes: ["financeiro", "suporte", "pedagogico", "moderador", "analista"], pronta: true },
  { id: "alunos", rotulo: "Alunos", href: "/admin/alunos", grupo: "Operação", funcoes: ["suporte", "pedagogico", "analista"], pronta: true },
  { id: "tutores", rotulo: "Tutores de IA", href: "/admin/tutores", grupo: "Operação", funcoes: ["pedagogico", "analista"], pronta: true },
  { id: "conversas", rotulo: "Conversas", href: "/admin/conversas", grupo: "Operação", funcoes: ["suporte", "moderador"], pronta: false },

  { id: "aprendizagem", rotulo: "Aprendizagem", href: "/admin/aprendizagem", grupo: "Aprendizagem", funcoes: ["pedagogico", "analista"], pronta: false },
  { id: "conteudos", rotulo: "Conteúdos", href: "/admin/conteudo", grupo: "Aprendizagem", funcoes: ["pedagogico"], pronta: true },
  { id: "certificacao", rotulo: "Certificação", href: "/admin/certificacao", grupo: "Aprendizagem", funcoes: ["pedagogico"], pronta: true },

  { id: "assinaturas", rotulo: "Assinaturas", href: "/admin/assinaturas", grupo: "Dinheiro", funcoes: ["financeiro", "suporte", "analista"], pronta: true },
  { id: "reembolsos", rotulo: "Reembolsos", href: "/admin/reembolsos", grupo: "Dinheiro", funcoes: ["financeiro", "suporte"], pronta: true },
  { id: "custos", rotulo: "Custos de IA", href: "/admin/dashboard", grupo: "Dinheiro", funcoes: ["financeiro", "analista"], pronta: true },
  { id: "ferramentas", rotulo: "Custos e ferramentas", href: "/admin/custos", grupo: "Dinheiro", funcoes: ["financeiro", "analista"], pronta: true },
  { id: "financeiro", rotulo: "Financeiro", href: "/admin/financeiro", grupo: "Dinheiro", funcoes: ["financeiro", "analista"], pronta: true },
  { id: "cupons", rotulo: "Cupons e QR Codes", href: "/admin/cupons", grupo: "Dinheiro", funcoes: ["financeiro"], pronta: true },

  { id: "suporte", rotulo: "Suporte", href: "/admin/suporte", grupo: "Cuidado", funcoes: ["suporte"], pronta: false },
  { id: "seguranca", rotulo: "Segurança e moderação", href: "/admin/seguranca", grupo: "Cuidado", funcoes: ["moderador"], pronta: false },
  { id: "depoimentos", rotulo: "Depoimentos", href: "/admin/depoimentos", grupo: "Cuidado", funcoes: ["moderador"], pronta: true },
  { id: "lgpd", rotulo: "Consentimentos LGPD", href: "/admin/auditoria", grupo: "Cuidado", funcoes: ["suporte"], pronta: true },

  { id: "pagina-vendas", rotulo: "Página de vendas", href: "/admin/pagina-de-vendas", grupo: "Página de vendas", funcoes: ["analista"], pronta: true },
  { id: "origem", rotulo: "Origem dos cadastros", href: "/admin/origem", grupo: "Página de vendas", funcoes: ["analista"], pronta: true },
  { id: "escolas", rotulo: "Parcerias com escolas", href: "/admin/escolas", grupo: "Página de vendas", funcoes: [], pronta: true },

  { id: "logs", rotulo: "Logs e auditoria", href: "/admin/logs", grupo: "Sistema", funcoes: ["analista"], pronta: true },
  { id: "configuracoes", rotulo: "Configurações", href: "/admin/configuracoes", grupo: "Sistema", funcoes: [], pronta: false },
];

export function areaPorId(id: string): AreaAdmin | undefined {
  return AREAS_ADMIN.find((a) => a.id === id);
}

export function normalizarFuncoes(valor: unknown): FuncaoAdmin[] {
  if (!Array.isArray(valor)) return [];
  return valor.filter((f): f is FuncaoAdmin => (FUNCOES_ADMIN as readonly string[]).includes(f));
}

export function podeAcessar(funcoes: readonly string[], area: AreaAdmin | string): boolean {
  const a = typeof area === "string" ? areaPorId(area) : area;
  if (!a) return false;
  if (funcoes.includes("geral")) return true;
  return a.funcoes.some((f) => funcoes.includes(f));
}

// Área do caminho atual (prefixo mais longo) — para destaque no menu e
// breadcrumbs. "/admin" só casa exatamente.
export function areaDoCaminho(caminho: string): AreaAdmin | undefined {
  return AREAS_ADMIN.filter((a) => (a.href === "/admin" ? caminho === "/admin" : caminho === a.href || caminho.startsWith(`${a.href}/`))).sort(
    (x, y) => y.href.length - x.href.length,
  )[0];
}
