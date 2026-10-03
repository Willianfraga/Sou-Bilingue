import Link from "next/link";
import { requireSessao } from "@/lib/auth/guards";
import { getPerfilDoAluno } from "@/lib/data/alunos";
import { getOnboardingDoAluno } from "@/lib/data/onboarding";
import { rotuloDaOpcao } from "@/lib/onboarding/questionario";
import { NOME_DO_IDIOMA } from "@/lib/types";
import { SeletorIdioma } from "@/components/aluno/SeletorIdioma";

// Nível informado na entrevista de boas-vindas → faixa do quadro europeu
// usada nas trilhas abaixo. "Não sei" não mostra selo.
const FAIXA_DO_NIVEL: Record<string, string> = {
  nunca_estudei: "A1",
  iniciante: "A1",
  basico: "A2",
  intermediario: "B1",
  avancado: "B2",
};

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

  // A entrevista de boas-vindas já perguntou do que o aluno gosta: aqui a
  // tela só oferece esses assuntos para começar com um toque, sem perguntar
  // de novo "o que você quer aprender".
  const respostas = (await getOnboardingDoAluno(sessao.userId))?.respostas ?? {};
  const temasFavoritos = Array.isArray(respostas.temasConversa) ? respostas.temasConversa : [];
  const faixa = typeof respostas.nivel === "string" ? FAIXA_DO_NIVEL[respostas.nivel] : undefined;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <section className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-100 md:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-indigo-600">Aprenda {idioma} do seu jeito</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Pronto para praticar?</h1>
            <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
              {temasFavoritos.length > 0
                ? "Separei os assuntos de que você mais gosta. Toque em um e a conversa já começa."
                : "Escolha um assunto ou deixe o tutor escolher por você."}
            </p>
          </div>
          {faixa && <span className="rounded-2xl bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700" title="Seu nível atual">{faixa}</span>}
        </div>

        {temasFavoritos.length > 0 && (
          <ul className="mt-6 flex flex-wrap gap-2" aria-label="Assuntos de que você gosta">
            {temasFavoritos.map((tema) => {
              const rotulo = rotuloDaOpcao("temasConversa", tema);
              return (
                <li key={tema}>
                  <Link
                    href={`/aluno/aula?tema=${encodeURIComponent(rotulo)}`}
                    className="inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-800 transition hover:-translate-y-0.5 hover:border-indigo-400 focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200"
                  >
                    {rotulo}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        <form action="/aluno/aula" className="mt-6 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 p-4 text-white shadow-lg shadow-indigo-100">
          <label htmlFor="tema" className="block text-xs font-semibold text-indigo-100">Outro assunto em mente? (opcional)</label>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input id="tema" name="tema" maxLength={180} placeholder="Ex.: entrevista de emprego, pedir comida" className="min-w-0 flex-1 rounded-xl border border-white/20 bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-white/70" />
            <button type="submit" className="btn-premium whitespace-nowrap">Conversar agora <span aria-hidden="true">→</span></button>
          </div>
          <Link href="/aluno/aula" className="mt-3 inline-flex text-xs font-semibold text-indigo-100 underline decoration-indigo-300 underline-offset-4">Deixar o tutor escolher o assunto</Link>
        </form>

        {perfil && (
          <div id="escolher-idioma" className="mt-6 scroll-mt-24">
            <SeletorIdioma atual={perfil.idioma} destino="/aluno/licoes" />
          </div>
        )}
      </section>

      <details className="group rounded-[2rem] bg-white p-4 shadow-sm ring-1 ring-slate-100 md:p-5">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 p-3 text-white shadow-lg shadow-indigo-100 transition hover:-translate-y-0.5 hover:shadow-xl [&::-webkit-details-marker]:hidden">
          <span>
            <span className="btn-premium pointer-events-none">Seguir lições sugeridas <span aria-hidden="true">→</span></span>
            <span className="mt-2 block px-2 text-xs text-indigo-100">Abra somente se quiser uma trilha pronta</span>
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
