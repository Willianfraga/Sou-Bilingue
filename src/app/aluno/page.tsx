import Image from "next/image";
import Link from "next/link";
import { MenuBento } from "@/components/aluno/MenuBento";
import { resumirEntrevista } from "@/lib/aluno/inicio";
import { requirePapel } from "@/lib/auth/guards";
import { getPerfilDoAluno } from "@/lib/data/alunos";
import { getOnboardingDoAluno } from "@/lib/data/onboarding";
import { getTutorPorId } from "@/lib/data/tutores";
import { NOME_DO_IDIOMA } from "@/lib/types";

export const dynamic = "force-dynamic";

// Tela inicial do aluno: tela cheia azul, só o menu bento, o tutor e o botão
// "Iniciar minha aula". Personalizada com as respostas da entrevista de
// boas-vindas (nome preferido, idioma, nível, objetivo e um tema do dia).
export default async function InicioDoAluno() {
  const sessao = await requirePapel("aluno");
  const [perfil, onboarding] = await Promise.all([getPerfilDoAluno(sessao.userId), getOnboardingDoAluno(sessao.userId)]);
  const tutor = perfil?.tutorId ? await getTutorPorId(perfil.tutorId) : null;
  const r = resumirEntrevista(onboarding?.respostas, sessao.nome);
  // Idioma atual do aluno (pode ter mudado depois da entrevista).
  const idioma = perfil?.idioma ? NOME_DO_IDIOMA[perfil.idioma] : r.idioma;
  const chips = [idioma, r.nivel, r.objetivo && `Objetivo: ${r.objetivo}`].filter(Boolean) as string[];

  return (
    <div className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-gradient-to-br from-[#2c3e60] via-[#536ec8] to-[#6f85d9] text-white">
      <div aria-hidden className="pointer-events-none absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-white/15 blur-3xl" />

      <header className="relative z-10 mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-4">
        <span className="text-base font-black uppercase tracking-[0.14em]">Sou Bilíngue</span>
        <MenuBento nome={r.nome} claro />
      </header>

      <main className="relative z-0 mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-6 px-5 pb-10 text-center">
        <div>
          <h1 className="text-3xl font-black sm:text-4xl">Olá, {r.nome}!</h1>
          {chips.length > 0 && (
            <ul aria-label="Sua aula" className="mt-3 flex flex-wrap justify-center gap-2">
              {chips.map((c) => (
                <li key={c} className="rounded-full bg-white/15 px-3 py-1 text-sm font-semibold ring-1 ring-white/25">{c}</li>
              ))}
            </ul>
          )}
        </div>

        {tutor ? (
          <figure className="w-full">
            <div className="overflow-hidden rounded-[2rem] shadow-2xl shadow-[#1f2c47]/50 ring-4 ring-white/20">
              {tutor.foto_url ? (
                <Image
                  src={tutor.foto_url}
                  alt={`${tutor.nome}, seu tutor virtual`}
                  width={1652}
                  height={952}
                  priority
                  sizes="(max-width: 640px) 92vw, 576px"
                  className="aspect-[4/3] w-full object-cover object-[50%_25%]"
                />
              ) : (
                <div className="flex aspect-[4/3] items-center justify-center bg-[#536ec8] text-7xl font-black">{tutor.nome.slice(0, 1)}</div>
              )}
            </div>
            <figcaption className="mt-4">
              <span className="block text-2xl font-black">{tutor.nome}</span>
              {r.temaDoDia ? (
                <span className="mt-1 block text-white/80">Hoje {tutor.nome} preparou uma conversa sobre <strong className="text-white">{r.temaDoDia.toLowerCase()}</strong>.</span>
              ) : (
                tutor.descricao && <span className="mt-1 block text-white/80">{tutor.descricao}</span>
              )}
            </figcaption>
          </figure>
        ) : (
          <p className="text-white/80">Escolha seu tutor no menu para começar.</p>
        )}

        <Link
          href="/aluno/aula"
          className="flex min-h-[76px] w-full items-center justify-center gap-3 rounded-3xl bg-white px-6 text-xl font-black text-[#3a4f9e] shadow-2xl shadow-[#1f2c47]/40 transition hover:-translate-y-0.5 hover:bg-[#eef1ff] focus:outline-none focus-visible:ring-4 focus-visible:ring-white/60 sm:text-2xl"
        >
          <span aria-hidden>🎙️</span>
          Iniciar minha aula
        </Link>
      </main>
    </div>
  );
}
