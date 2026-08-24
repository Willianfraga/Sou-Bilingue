import { AulaChatComHoras } from "@/components/aluno/AulaChatComHoras";
import { requireSessao } from "@/lib/auth/guards";
import { getPerfilDoAluno } from "@/lib/data/alunos";
import { getTutorPorId } from "@/lib/data/tutores";
import { NOME_DO_IDIOMA } from "@/lib/types";
import { getActiveSubscription } from "@/lib/billing/subscription";

const IDIOMA_DA_VOZ = {
  espanhol: "es-ES",
  frances: "fr-FR",
  ingles: "en-US",
  mandarim: "zh-CN",
  italiano: "it-IT",
};

export default async function Aula({
  searchParams,
}: {
  searchParams: Promise<{ tema?: string }>;
}) {
  const { tema } = await searchParams;
  const sessao = await requireSessao();
  const perfil = await getPerfilDoAluno(sessao.userId);
  if (!perfil) return <p className="text-neutral-500">Perfil nao encontrado.</p>;

  const tutor = await getTutorPorId(perfil.tutorId);
  const assinatura = await getActiveSubscription(sessao.userId);
  const tituloTutor = `${tutor?.nome ?? "Tutor"} - ${NOME_DO_IDIOMA[perfil.idioma]}`;

  if (!assinatura) {
    return (
      <section className="mx-auto max-w-xl rounded-3xl border border-amber-200 bg-amber-50 p-8 text-center">
        <h1 className="text-xl font-bold text-amber-950">Escolha um plano para conversar</h1>
        <p className="mt-2 text-sm text-amber-800">Sua conta ainda não possui horas ativas.</p>
        <a href="/checkout" className="mt-5 inline-flex rounded-full bg-amber-900 px-5 py-3 font-semibold text-white">
          Ver planos
        </a>
      </section>
    );
  }

  return (
    <AulaChatComHoras
      tituloTutor={tituloTutor}
      idiomaDaVoz={IDIOMA_DA_VOZ[perfil.idioma]}
      fotoTutor={tutor?.foto_url}
      temaInicial={tema?.trim().slice(0, 180)}
      alunoId={sessao.userId}
      horasRestantes={assinatura.horas_restantes}
      horasTotal={assinatura.horas_total}
    />
  );
}
