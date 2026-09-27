import { CampoPerfil } from "@/components/aluno/CampoPerfil";
import { requireSessao } from "@/lib/auth/guards";
import { getPerfilDoAluno } from "@/lib/data/alunos";
import { getOnboardingDoAluno } from "@/lib/data/onboarding";
import { getTutorPorId } from "@/lib/data/tutores";
import { PERGUNTAS, PREFIRO_NAO_RESPONDER, rotuloDaOpcao, type Pergunta, type ValorResposta } from "@/lib/onboarding/questionario";
import { NOME_DO_IDIOMA, NOME_DO_PLANO } from "@/lib/types";

// Resumo das preferências da entrevista de boas-vindas.
const PREFERENCIAS_EM_DESTAQUE = [
  "nomePreferido",
  "nivel",
  "objetivos",
  "temasConversa",
  "habilidadesPrioritarias",
  "preferenciaCorrecao",
  "temasEvitados",
] as const;

function textoDaResposta(pergunta: Pergunta, valor: ValorResposta | undefined): string {
  if (valor === undefined || valor === "" || (Array.isArray(valor) && valor.length === 0)) return "—";
  if (valor === PREFIRO_NAO_RESPONDER) return "Prefiro não responder";
  if (pergunta.tipo === "texto") return String(valor);
  return (Array.isArray(valor) ? valor : [valor]).map((v) => rotuloDaOpcao(pergunta.id, v)).join(", ");
}

// Perfil e tutor já vêm do banco de verdade. Sem edição ainda — "Trocar"
// fica desabilitado até o fluxo de edição existir.
export default async function Perfil() {
  const sessao = await requireSessao();
  const perfil = await getPerfilDoAluno(sessao.userId);

  if (!perfil) {
    return <p className="text-neutral-500">Perfil não encontrado.</p>;
  }

  const tutor = await getTutorPorId(perfil.tutorId);
  const onboarding = await getOnboardingDoAluno(sessao.userId);
  const respostas = onboarding?.respostas ?? {};

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <div>
        <span className="font-mono text-xs uppercase tracking-widest text-neutral-400">
          Cadastro
        </span>
        <h1 className="mt-1 text-2xl font-bold">Perfil</h1>
      </div>

      <div className="rounded-lg border border-neutral-200 px-5">
        <CampoPerfil
          label="Idioma"
          valor={NOME_DO_IDIOMA[perfil.idioma]}
          detalhe={`Sotaque: ${perfil.sotaque}`}
        />
        <CampoPerfil label="Plano" valor={NOME_DO_PLANO[perfil.plano]} />
        <CampoPerfil
          label="Tutor"
          valor={tutor?.nome ?? "—"}
          detalhe={tutor?.descricao}
        />
        <CampoPerfil label="Objetivo pessoal" valor={perfil.objetivoPessoal} />
      </div>

      <section id="preferencias" aria-labelledby="titulo-preferencias" className="scroll-mt-8">
        <h2 id="titulo-preferencias" className="text-lg font-bold">
          Preferências das aulas
        </h2>
        <p className="mt-1 text-sm text-neutral-500">
          O que você contou na entrevista de boas-vindas. Seu tutor usa isso em todas as aulas.
        </p>
        <div className="mt-3 rounded-lg border border-neutral-200 px-5">
          {PREFERENCIAS_EM_DESTAQUE.map((id) => {
            const pergunta = PERGUNTAS.find((p) => p.id === id)!;
            return <CampoPerfil key={id} label={pergunta.titulo} valor={textoDaResposta(pergunta, respostas[id])} />;
          })}
        </div>
        <div className="mt-3 flex flex-wrap gap-3">
          <a
            href="/boas-vindas?modo=editar"
            className="rounded-md bg-violet-700 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-800 focus:outline-none focus-visible:ring-4 focus-visible:ring-violet-300"
          >
            Editar respostas
          </a>
          <a
            href="/boas-vindas?modo=refazer"
            className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-violet-300"
          >
            Refazer entrevista
          </a>
        </div>
      </section>

      <button
        type="button"
        disabled
        title="Edição ainda não implementada"
        className="w-fit cursor-not-allowed rounded-md border border-neutral-200 px-4 py-2 text-sm text-neutral-400"
      >
        Editar perfil
      </button>
    </div>
  );
}
