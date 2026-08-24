import Link from "next/link";
import { requireSessao } from "@/lib/auth/guards";
import { getPerfilDoAluno } from "@/lib/data/alunos";
import { NOME_DO_IDIOMA } from "@/lib/types";
import { SeletorIdioma } from "@/components/aluno/SeletorIdioma";

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
            <p className="text-sm font-semibold text-indigo-600">Aprenda {idioma} do seu jeito</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">O que você quer aprender hoje?</h1>
            <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">Você escolhe o assunto e o ritmo. As trilhas abaixo são sugestões opcionais, não etapas obrigatórias.</p>
          </div>
          <span className="rounded-2xl bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700">A1</span>
        </div>
        {perfil && <div className="mt-6"><SeletorIdioma atual={perfil.idioma} destino="/aluno/licoes" /></div>}
        <form action="/aluno/aula" className="mt-6 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 p-4 text-white shadow-lg shadow-indigo-100">
          <label htmlFor="tema" className="block text-xs font-semibold text-indigo-100">Conte ao tutor o que você quer praticar</label>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input id="tema" name="tema" maxLength={180} placeholder="Ex.: entrevista, viagem, música ou conversa livre" className="min-w-0 flex-1 rounded-xl border border-white/20 bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-white/70" />
            <button type="submit" className="rounded-xl bg-white px-5 py-3 text-sm font-bold text-indigo-700 transition hover:bg-indigo-50">Conversar agora &rarr;</button>
          </div>
          <Link href="/aluno/aula" className="mt-3 inline-flex text-xs font-semibold text-indigo-100 underline decoration-indigo-300 underline-offset-4">Prefiro que o tutor me ajude a escolher</Link>
        </form>
      </section>

      <details className="group rounded-[2rem] bg-white p-4 shadow-sm ring-1 ring-slate-100 md:p-5">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-2xl border border-indigo-100 bg-indigo-50 px-5 py-4 text-indigo-900 transition hover:border-indigo-300 hover:bg-indigo-100 [&::-webkit-details-marker]:hidden">
          <span>
            <span className="block text-base font-bold">Seguir lições sugeridas</span>
            <span className="mt-1 block text-xs text-indigo-600">Abra somente se quiser uma trilha pronta</span>
          </span>
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-xl font-bold text-indigo-600 transition group-open:rotate-45">+</span>
        </summary>

        <section className="mt-5 space-y-5 border-t border-slate-100 pt-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">Sugestões opcionais</p>
            <p className="mt-1 text-sm text-slate-500">Escolha qualquer tema, de qualquer nível. Você pode mudar quando quiser.</p>
          </div>
          {trilhas.map((trilha, indice) => (
          <article key={trilha.nivel} className="rounded-[1.75rem] bg-white p-5 shadow-sm ring-1 ring-slate-100">
            <div className="flex items-start gap-3">
              <span className={"flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-bold " + (indice === 0 ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500")}>{trilha.nivel}</span>
              <div><h2 className="font-bold text-slate-900">{trilha.nome}</h2><p className="mt-1 text-sm text-slate-500">{trilha.descricao}</p></div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              {trilha.aulas.map((aula, aulaIndice) => (
                <Link key={aula} href={`/aluno/aula?tema=${encodeURIComponent(aula)}`} className={"rounded-2xl border p-3 text-left transition hover:-translate-y-0.5 hover:shadow-sm " + (indice === 0 && aulaIndice === 0 ? "border-indigo-200 bg-indigo-50 text-indigo-900 hover:border-indigo-400" : "border-slate-100 bg-slate-50 text-slate-600 hover:border-indigo-200 hover:bg-indigo-50")}>
                  <span className="block text-[10px] font-bold uppercase tracking-wider opacity-60">Tema sugerido</span>
                  <span className="mt-1 block text-sm font-semibold leading-5">{aula}</span>
                </Link>
              ))}
            </div>
          </article>
          ))}
        </section>
      </details>
    </div>
  );
}
