import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// Registro das conversas das aulas (migration 0020; texto apagado após 90
// dias pela migration 0021; política em /privacidade). Uma conversa = falas
// do mesmo aluno com o mesmo tutor sem pausa maior que 30 minutos — decidido
// no servidor, sem depender do navegador. Nunca derruba a aula: em falha,
// devolve null e a aula segue.

export const PAUSA_QUE_ABRE_NOVA_CONVERSA_MS = 30 * 60_000;

// Pura (testada): a conversa anterior ainda vale?
export function continuaConversa(ultimaMensagemEm: string | null | undefined, agora = new Date()): boolean {
  if (!ultimaMensagemEm) return false;
  return agora.getTime() - new Date(ultimaMensagemEm).getTime() <= PAUSA_QUE_ABRE_NOVA_CONVERSA_MS;
}

export async function registrarFalaDoAluno(p: {
  alunoId: string;
  tutorId: string | null;
  idioma: string | null;
  texto: string;
}): Promise<{ conversaId: string; mensagemId: string } | null> {
  try {
    const db = createSupabaseAdminClient();
    let consulta = db.from("conversas").select("id, ultima_mensagem_em").eq("aluno_id", p.alunoId);
    consulta = p.tutorId ? consulta.eq("tutor_id", p.tutorId) : consulta.is("tutor_id", null);
    const { data: ultima } = await consulta.order("ultima_mensagem_em", { ascending: false }).limit(1).maybeSingle();

    const agora = new Date().toISOString();
    let conversaId = ultima && continuaConversa(ultima.ultima_mensagem_em) ? ultima.id : null;
    if (!conversaId) {
      const { data: nova, error } = await db
        .from("conversas")
        .insert({ aluno_id: p.alunoId, tutor_id: p.tutorId, idioma: p.idioma })
        .select("id")
        .single();
      if (error || !nova) throw new Error(error?.message ?? "sem id");
      conversaId = nova.id as string;
    }

    const { data: msg, error: erroMsg } = await db
      .from("mensagens")
      .insert({ conversa_id: conversaId, aluno_id: p.alunoId, papel: "aluno", texto: p.texto.slice(0, 8000) })
      .select("id")
      .single();
    if (erroMsg || !msg) throw new Error(erroMsg?.message ?? "sem id");
    await db.from("conversas").update({ ultima_mensagem_em: agora }).eq("id", conversaId);
    return { conversaId: conversaId!, mensagemId: msg.id as string };
  } catch (e) {
    console.error("Falha ao registrar fala do aluno:", e instanceof Error ? e.message : e);
    return null;
  }
}

export async function registrarRespostaDoTutor(p: {
  conversaId: string;
  alunoId: string;
  texto: string | null;
  status: "ok" | "erro";
  erro?: string;
  modelo?: string;
  versaoPrompt?: number;
  latenciaMs?: number;
}): Promise<string | null> {
  try {
    const db = createSupabaseAdminClient();
    const { data, error } = await db
      .from("mensagens")
      .insert({
        conversa_id: p.conversaId,
        aluno_id: p.alunoId,
        papel: "tutor",
        texto: p.texto ? p.texto.slice(0, 8000) : null,
        status: p.status,
        erro: p.erro ? p.erro.slice(0, 300) : null,
        modelo: p.modelo ?? null,
        versao_prompt: p.versaoPrompt ?? null,
        latencia_ms: p.latenciaMs ?? null,
      })
      .select("id")
      .single();
    if (error || !data) throw new Error(error?.message ?? "sem id");
    await db.from("conversas").update({ ultima_mensagem_em: new Date().toISOString() }).eq("id", p.conversaId);
    return data.id as string;
  } catch (e) {
    console.error("Falha ao registrar resposta do tutor:", e instanceof Error ? e.message : e);
    return null;
  }
}
