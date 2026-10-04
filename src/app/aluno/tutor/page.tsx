import { SeletorTutor } from "@/components/aluno/SeletorTutor";
import { requirePapel } from "@/lib/auth/guards";
import { getPerfilDoAluno } from "@/lib/data/alunos";
import { getTutores } from "@/lib/data/tutores";

export const dynamic = "force-dynamic";

// Meu tutor (menu bento): escolher o professor virtual. Saiu da tela da
// aula para não distrair durante a conversa.
export default async function MeuTutor() {
  const sessao = await requirePapel("aluno");
  const [perfil, tutores] = await Promise.all([getPerfilDoAluno(sessao.userId), getTutores()]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-[#536ec8]">Minha conta</p>
        <h1 className="mt-1 text-2xl font-black text-slate-950">Meu tutor</h1>
        <p className="mt-1 text-sm text-slate-600">Escolha quem vai conversar com você. A troca vale a partir da próxima aula.</p>
      </div>
      {perfil ? <SeletorTutor tutores={tutores} atualId={perfil.tutorId} aberto /> : <p className="text-slate-500">Perfil não encontrado.</p>}
    </div>
  );
}
