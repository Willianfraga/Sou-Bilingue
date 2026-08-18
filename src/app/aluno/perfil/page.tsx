import { CampoPerfil } from "@/components/aluno/CampoPerfil";
import { requireSessao } from "@/lib/auth/guards";
import { getPerfilDoAluno } from "@/lib/data/alunos";
import { getTutorPorId } from "@/lib/data/tutores";
import { NOME_DO_IDIOMA, NOME_DO_PLANO } from "@/lib/types";

// Perfil e tutor já vêm do banco de verdade. Sem edição ainda — "Trocar"
// fica desabilitado até o fluxo de edição existir.
export default async function Perfil() {
  const sessao = await requireSessao();
  const perfil = await getPerfilDoAluno(sessao.userId);

  if (!perfil) {
    return <p className="text-neutral-500">Perfil não encontrado.</p>;
  }

  const tutor = await getTutorPorId(perfil.tutorId);

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
