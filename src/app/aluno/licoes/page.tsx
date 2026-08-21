import Link from "next/link";
import { requireSessao } from "@/lib/auth/guards";
import { getPerfilDoAluno } from "@/lib/data/alunos";
import { NOME_DO_IDIOMA } from "@/lib/types";

const trilhas = [
  { nivel: "A1", nome: "Iniciante", descricao: "Primeiras conversas para o dia a dia.", aulas: ["Apresente-se", "Dias e horas", "Numeros e idade", "Descricao pessoal"] },
  { nivel: "A2", nome: "Basico", descricao: "Situacoes reais de viagem e rotina.", aulas: ["Comida e bebida", "Na cidade", "No restaurante", "Transporte"] },
  { nivel: "B1", nome: "Intermediario", descricao: "Converse com mais autonomia e naturalidade.", aulas: ["Passado regular", "Gostos e preferencias", "Aeroporto", "Conectores"] },
  { nivel: "B2", nome: "Intermediario avancado", descricao: "Construa ideias complexas com seguranca.", aulas: ["Mais-que-perfeito", "Clausulas relativas", "Desejos", "Oracoes temporarias"] },
];

export default async function Licoes() {
  const sessao = await requireSessao();
  const perfil = await getPerfilDoAluno(sessao.userId);
  const idioma = perfil ? NOME_DO_IDIOMA[perfil.idioma] : "seu idioma";

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <section className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-100 md:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-indigo-600">Trilha de {idioma}</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Licoes</h1>
            <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">Escolha um tema. Antes da conversa, voce revisa palavras e frases importantes.</p>
          </div>
          <span className="rounded-2xl bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700">A1</span>
        </div>
        <Link href="/aluno/aula" className="mt-6 flex items-center justify-between rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-4 text-white shadow-lg shadow-indigo-100">
          <span><span className="block text-xs font-medium text-indigo-100">Pratica livre com seu tutor</span><span className="mt-1 block text-base font-bold">Iniciar conversa casual</span></span>
          <span className="text-xl">&rarr;</span>
        </Link>
      </section>

      <section className="space-y-5">
        {trilhas.map((trilha, indice) => (
          <article key={trilha.nivel} className="rounded-[1.75rem] bg-white p-5 shadow-sm ring-1 ring-slate-100">
            <div className="flex items-start gap-3">
              <span className={"flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-bold " + (indice === 0 ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500")}>{trilha.nivel}</span>
              <div><h2 className="font-bold text-slate-900">{trilha.nome}</h2><p className="mt-1 text-sm text-slate-500">{trilha.descricao}</p></div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              {trilha.aulas.map((aula, aulaIndice) => (
                <Link key={aula} href="/aluno/aula" className={"rounded-2xl border p-3 text-left transition " + (indice === 0 && aulaIndice === 0 ? "border-indigo-200 bg-indigo-50 text-indigo-900 hover:border-indigo-400" : "border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200")}>
                  <span className="block text-[10px] font-bold uppercase tracking-wider opacity-60">Licao {aulaIndice + 1}</span>
                  <span className="mt-1 block text-sm font-semibold leading-5">{aula}</span>
                </Link>
              ))}
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
