"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePapel } from "@/lib/auth/guards";
import { cancelarAssinaturaDoAluno } from "@/lib/billing/cancelamento";
import { getSituacaoReembolso, solicitarReembolso } from "@/lib/billing/reembolso";
import { limitar } from "@/lib/seguranca/limite";

// O aluno vem da sessão; o formulário só manda o motivo e a confirmação.
export async function cancelarMinhaAssinatura(formData: FormData) {
  const sessao = await requirePapel("aluno");
  if (formData.get("confirmo") !== "sim") redirect("/assinatura?erro=confirmacao");
  if (!limitar(`cancelar:${sessao.userId}`, 5, 10 * 60_000).permitido) redirect("/assinatura?erro=tentativas");

  const r = await cancelarAssinaturaDoAluno(sessao.userId, formData.get("motivo"));
  revalidatePath("/aluno", "layout");
  redirect(r.ok ? "/assinatura?cancelada=1" : "/assinatura?erro=falha");
}

// Confere a senha num cliente descartável (sem gravar sessão/cookie) — a
// sessão atual do aluno não muda.
async function senhaConfere(email: string, senha: string, userId: string) {
  if (!email || !senha) return false;
  const cliente = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await cliente.auth.signInWithPassword({ email, password: senha });
  if (error || data.user?.id !== userId) return false;
  await cliente.auth.signOut({ scope: "local" }).catch(() => {});
  return true;
}

// Pedido de reembolso. Prazo, valor e pagamento são calculados no servidor;
// do formulário vêm só motivo, comentário, confirmação e (dentro do prazo,
// quando o estorno sai na hora) a senha.
export async function pedirReembolso(formData: FormData) {
  const sessao = await requirePapel("aluno");
  if (formData.get("confirmo") !== "sim") redirect("/assinatura?erro=confirmacao_reembolso");
  if (!limitar(`reembolso:${sessao.userId}`, 5, 10 * 60_000).permitido) redirect("/assinatura?erro=tentativas");

  const situacao = await getSituacaoReembolso(sessao.userId);
  if (situacao.dentro && !situacao.pedidos.length) {
    const senha = String(formData.get("senha") ?? "");
    if (!(await senhaConfere(sessao.email, senha, sessao.userId))) redirect("/assinatura?erro=senha");
  }

  const r = await solicitarReembolso(sessao.userId, { motivo: formData.get("motivo"), comentario: formData.get("comentario") });
  revalidatePath("/aluno", "layout");
  if (!r.ok) redirect(`/assinatura?erro=${!situacao.dentro && !formData.get("motivo") ? "motivo" : "falha_reembolso"}`);
  redirect(`/assinatura?protocolo=${encodeURIComponent(r.reembolso.protocolo)}`);
}
