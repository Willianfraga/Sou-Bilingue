// Regras puras da área Tutores (testadas em test/admin.test.mjs).

export const STATUS_TUTOR = ["rascunho", "teste", "ativo", "pausado", "arquivado"] as const;
export type StatusTutor = (typeof STATUS_TUTOR)[number];
export const ROTULO_STATUS_TUTOR: Record<StatusTutor, string> = {
  rascunho: "Rascunho",
  teste: "Em teste",
  ativo: "Ativo",
  pausado: "Pausado",
  arquivado: "Arquivado",
};

// Validação da edição (pura, testada).
export function validarEdicaoTutor(e: { nome: unknown; descricao: unknown; status: unknown; motivo: unknown }):
  | { ok: true; dados: { nome: string; descricao: string; status: StatusTutor }; motivo: string }
  | { ok: false; erro: string } {
  const limpar = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/[\u0000-\u001f\u007f<>]/g, " ").trim().slice(0, max) : "");
  const nome = limpar(e.nome, 40);
  const descricao = limpar(e.descricao, 300);
  const motivo = limpar(e.motivo, 500);
  if (nome.length < 2) return { ok: false, erro: "Nome muito curto." };
  if (!(STATUS_TUTOR as readonly string[]).includes(String(e.status))) return { ok: false, erro: "Status inválido." };
  if (motivo.length < 5) return { ok: false, erro: "Escreva o motivo da alteração (mínimo 5 caracteres)." };
  return { ok: true, dados: { nome, descricao, status: e.status as StatusTutor }, motivo };
}
