"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePapel } from "@/lib/auth/guards";
import { salvarConteudoVendas } from "@/lib/data/vendas";
import { CONTEUDO_PADRAO, textoParaDepoimentos, textoParaPerguntas } from "@/lib/vendas/conteudo";

const CAMPOS_TEXTO = [
  "heroSelo", "heroTitulo", "heroDestaque", "heroSubtitulo",
  "ctaPrincipal", "ctaSecundario", "ctaPlanos", "ctaFinal",
  "avisoPromocional", "suporteEmail", "suporteWhatsapp", "horarioAtendimento",
  "empresaNome", "empresaCnpj", "empresaEndereco",
  "seoTitulo", "seoDescricao", "variante", "videoAula",
] as const;

// Só admin (requirePapel + RLS app.is_admin no banco). Tudo passa por
// normalizarConteudo antes de gravar: limites, e-mail, telefone e sem HTML.
export async function salvarPaginaDeVendas(formData: FormData) {
  const sessao = await requirePapel("admin");

  const entrada: Record<string, unknown> = {};
  for (const campo of CAMPOS_TEXTO) entrada[campo] = String(formData.get(campo) ?? "");
  entrada.assistenteAtivo = formData.get("assistenteAtivo") === "sim";
  entrada.perguntas = textoParaPerguntas(String(formData.get("perguntas") ?? ""));
  entrada.depoimentos = textoParaDepoimentos(String(formData.get("depoimentos") ?? ""));

  const ok = await salvarConteudoVendas(entrada, sessao.userId);
  revalidatePath("/");
  redirect(`/admin/pagina-de-vendas?${ok ? "salvo=1" : "erro=1"}`);
}

export async function restaurarTextosPadrao() {
  const sessao = await requirePapel("admin");
  const ok = await salvarConteudoVendas(CONTEUDO_PADRAO, sessao.userId);
  revalidatePath("/");
  redirect(`/admin/pagina-de-vendas?${ok ? "restaurado=1" : "erro=1"}`);
}
