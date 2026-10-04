import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { registrarAuditoria } from "./auditoria";
import { SITUACOES } from "./alunos-regras";

export { ROTULO_ALERTA, ROTULO_SITUACAO, SITUACOES, mascararEmail } from "./alunos-regras";

// Área Alunos do painel (migration 0023). Só servidor, depois de requireArea.
// Toda ação sobre o aluno vai para a auditoria com motivo.

export type LinhaAluno = {
  id: string;
  nome: string;
  email: string | null;
  idioma: string;
  criado_em: string;
  suspenso_em: string | null;
  status_assinatura: string | null;
  plano: string | null;
  cancelando: boolean | null;
  uso_do_plano: number | null;
  ultimo_acesso: string | null;
  segundos_estudo: number;
  custo_usd: number;
  erros_7d: number;
  receita: number;
  alertas: string[];
};

export async function listarAlunos(f: { pagina: number; porPagina: number; busca?: string; plano?: string; idioma?: string; situacao?: string }) {
  const busca = f.busca?.replace(/[%_\\]/g, "").trim().slice(0, 80) || null;
  const situacao = (SITUACOES as readonly string[]).includes(f.situacao ?? "") ? f.situacao! : null;
  const { data, error } = await createSupabaseAdminClient().rpc("admin_alunos", {
    p_busca: busca,
    p_plano: f.plano || null,
    p_idioma: f.idioma || null,
    p_situacao: situacao,
    p_limite: f.porPagina,
    p_offset: (f.pagina - 1) * f.porPagina,
  });
  if (error) throw new Error(error.message);
  const r = (data ?? { total: 0, linhas: [] }) as { total: number; linhas: LinhaAluno[] };
  return { total: Number(r.total), linhas: r.linhas.map((l) => ({ ...l, custo_usd: Number(l.custo_usd), receita: Number(l.receita), segundos_estudo: Number(l.segundos_estudo) })) };
}

export type DetalheAluno = Record<string, unknown> & {
  perfil: Record<string, unknown> & { id: string; nome: string; email: string | null; suspenso_em: string | null; suspenso_motivo: string | null };
};

export async function detalheAluno(id: string): Promise<DetalheAluno | null> {
  const { data, error } = await createSupabaseAdminClient().rpc("admin_aluno_detalhe", { p_aluno: id });
  if (error) throw new Error(error.message);
  return (data as DetalheAluno) ?? null;
}

type Resultado = { ok: true } | { ok: false; erro: string };

// Suspensão: bloqueia o login (ban no Auth) e a sessão atual (getSessao
// ignora perfil suspenso). Não cancela cobrança — avisar na tela.
export async function suspenderAluno(adminId: string, alunoId: string, motivo: string): Promise<Resultado> {
  const texto = motivo.trim();
  if (texto.length < 5) return { ok: false, erro: "Escreva o motivo (mínimo 5 caracteres)." };
  const db = createSupabaseAdminClient();
  const { data: antes } = await db.from("profiles").select("suspenso_em, papel").eq("id", alunoId).maybeSingle();
  if (!antes || antes.papel !== "aluno") return { ok: false, erro: "Aluno não encontrado." };
  if (antes.suspenso_em) return { ok: false, erro: "A conta já está suspensa." };
  const { error: erroAuth } = await db.auth.admin.updateUserById(alunoId, { ban_duration: "876000h" });
  if (erroAuth) {
    await registrarAuditoria({ adminId, acao: "aluno.suspender", entidade: "aluno", entidadeId: alunoId, motivo: texto, resultado: "erro", depois: { erro: erroAuth.message } });
    return { ok: false, erro: "Não foi possível bloquear o login agora." };
  }
  const agora = new Date().toISOString();
  await db.from("profiles").update({ suspenso_em: agora, suspenso_motivo: texto.slice(0, 500) }).eq("id", alunoId);
  await registrarAuditoria({ adminId, acao: "aluno.suspender", entidade: "aluno", entidadeId: alunoId, antes: { suspenso_em: null }, depois: { suspenso_em: agora }, motivo: texto, resultado: "ok" });
  return { ok: true };
}

export async function reativarAluno(adminId: string, alunoId: string, motivo: string): Promise<Resultado> {
  const texto = motivo.trim();
  if (texto.length < 5) return { ok: false, erro: "Escreva o motivo (mínimo 5 caracteres)." };
  const db = createSupabaseAdminClient();
  const { data: antes } = await db.from("profiles").select("suspenso_em, suspenso_motivo, nome").eq("id", alunoId).maybeSingle();
  if (!antes?.suspenso_em) return { ok: false, erro: "A conta não está suspensa." };
  if (antes.nome === "Aluno anonimizado") return { ok: false, erro: "Conta anonimizada não pode ser reativada." };
  const { error } = await db.auth.admin.updateUserById(alunoId, { ban_duration: "none" });
  if (error) return { ok: false, erro: "Não foi possível liberar o login agora." };
  await db.from("profiles").update({ suspenso_em: null, suspenso_motivo: null }).eq("id", alunoId);
  await registrarAuditoria({ adminId, acao: "aluno.reativar", entidade: "aluno", entidadeId: alunoId, antes: { suspenso_em: antes.suspenso_em, motivo: antes.suspenso_motivo }, depois: { suspenso_em: null }, motivo: texto, resultado: "ok" });
  return { ok: true };
}

export async function anonimizarAluno(adminId: string, alunoId: string, motivo: string, confirmacao: string): Promise<Resultado> {
  const texto = motivo.trim();
  if (confirmacao.trim() !== "ANONIMIZAR") return { ok: false, erro: "Digite ANONIMIZAR para confirmar." };
  if (texto.length < 10) return { ok: false, erro: "Descreva o pedido (mínimo 10 caracteres), ex.: data e canal do pedido do titular." };
  const { data, error } = await createSupabaseAdminClient().rpc("admin_anonimizar_aluno", { p_aluno: alunoId });
  const r = (data ?? {}) as { ok?: boolean; erro?: string };
  const ok = !error && r.ok === true;
  await registrarAuditoria({ adminId, acao: "aluno.anonimizar", entidade: "aluno", entidadeId: alunoId, motivo: texto, resultado: ok ? "ok" : "erro", depois: ok ? { anonimizado: true } : { erro: error?.message ?? r.erro } });
  return ok ? { ok: true } : { ok: false, erro: r.erro ?? "Não foi possível anonimizar agora." };
}

// Portabilidade (LGPD art. 18): tudo do aluno em JSON, incluindo o texto das
// conversas ainda guardado. Acesso registrado na auditoria.
export async function exportarDadosDoAluno(adminId: string, alunoId: string) {
  const db = createSupabaseAdminClient();
  const [detalhe, onboarding, memorias, mensagens, consentimentos, certificados] = await Promise.all([
    detalheAluno(alunoId),
    db.from("aluno_onboarding").select("respostas, versao_questionario, concluido_em").eq("aluno_id", alunoId).maybeSingle(),
    db.from("student_memories").select("chave, valor, criada_em").eq("aluno_id", alunoId),
    db.from("mensagens").select("conversa_id, papel, texto, criado_em").eq("aluno_id", alunoId).order("criado_em").limit(5000),
    db.from("consentimentos_lgpd").select("consentido_em, revogado_em").eq("aluno_id", alunoId),
    db.from("certificados").select("mes_referencia, idioma, plano, codigo_verificacao, emitido_em").eq("aluno_id", alunoId),
  ]);
  if (!detalhe) return null;
  await registrarAuditoria({ adminId, acao: "aluno.exportar_dados", entidade: "aluno", entidadeId: alunoId, resultado: "ok" });
  return {
    gerado_em: new Date().toISOString(),
    aviso: "Exportação dos dados pessoais do titular (LGPD, art. 18). Mensagens com mais de 90 dias já têm o texto apagado.",
    ...detalhe,
    entrevista_completa: onboarding.data ?? null,
    memorias: memorias.data ?? [],
    mensagens: mensagens.data ?? [],
    consentimentos: consentimentos.data ?? [],
    certificados: certificados.data ?? [],
  };
}

// Reposição de horas (Fase 3): soma ao ciclo atual com motivo, pela função
// horas_conceder (valida 0,25–100 h e assinatura ativa). Auditada.
export async function concederReposicao(adminId: string, alunoId: string, horas: number, motivo: string): Promise<Resultado> {
  const texto = motivo.trim();
  if (texto.length < 5) return { ok: false, erro: "Escreva o motivo (mínimo 5 caracteres)." };
  if (!Number.isFinite(horas) || horas < 0.25 || horas > 100) return { ok: false, erro: "Informe de 0,25 a 100 horas." };
  const { data, error } = await createSupabaseAdminClient().rpc("horas_conceder", { p_aluno: alunoId, p_horas: horas, p_motivo: texto, p_admin: adminId });
  if (error || !data?.ok) {
    const erro = data?.erro ?? "Não foi possível conceder agora.";
    await registrarAuditoria({ adminId, acao: "aluno.conceder_horas", entidade: "aluno", entidadeId: alunoId, motivo: texto, resultado: "erro", depois: { horas, erro: error?.message ?? erro } });
    return { ok: false, erro };
  }
  await registrarAuditoria({ adminId, acao: "aluno.conceder_horas", entidade: "aluno", entidadeId: alunoId, depois: { horas }, motivo: texto, resultado: "ok" });
  return { ok: true };
}
