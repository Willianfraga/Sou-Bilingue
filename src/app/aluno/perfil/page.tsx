import { CampoPerfil } from "@/components/aluno/CampoPerfil";
import { requireSessao } from "@/lib/auth/guards";
import { getPerfilDoAluno } from "@/lib/data/alunos";
import { getOnboardingDoAluno } from "@/lib/data/onboarding";
import { getMeuDepoimento } from "@/lib/data/depoimentos";
import { enviarMeuDepoimento, retirarMeuDepoimento } from "./actions";
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

const MENSAGENS_DEPOIMENTO: Record<string, string> = {
  enviado: "Obrigado! Seu depoimento vai para revisão antes de aparecer na página.",
  retirado: "Autorização retirada. O depoimento não aparece mais na página.",
  invalido: "Confira os campos do depoimento.",
  menor: "Depoimentos de menores de idade precisam da autorização do responsável — por enquanto não aceitamos.",
  tentativas: "Muitas tentativas seguidas. Aguarde alguns minutos.",
  falha: "Não foi possível enviar agora. Tente de novo.",
};

// Perfil, preferências de aula, assinatura e depoimento.
export default async function Perfil({
  searchParams,
}: {
  searchParams: Promise<{ depoimento?: string; msg?: string }>;
}) {
  const sessao = await requireSessao();
  const aviso = await searchParams;
  const perfil = await getPerfilDoAluno(sessao.userId);
  const meuDepoimento = await getMeuDepoimento(sessao.userId);

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

      <section id="preferencias" aria-labelledby="titulo-preferencias" className="scroll-mt-24">
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

      <section aria-labelledby="titulo-assinatura" className="rounded-lg border border-neutral-200 p-5">
        <h2 id="titulo-assinatura" className="text-lg font-bold">Assinatura</h2>
        <p className="mt-1 text-sm text-neutral-500">Veja seu plano ou cancele quando quiser, sem precisar falar com ninguém.</p>
        <a href="/assinatura" className="mt-3 inline-block text-sm font-semibold text-violet-700 hover:underline">
          Minha assinatura →
        </a>
      </section>

      <section id="depoimento" aria-labelledby="titulo-depoimento" className="scroll-mt-8 rounded-lg border border-neutral-200 p-5">
        <h2 id="titulo-depoimento" className="text-lg font-bold">Conte como está sendo</h2>
        {aviso.depoimento && MENSAGENS_DEPOIMENTO[aviso.depoimento] && (
          <p role="status" className="mt-3 rounded-md bg-violet-50 px-3 py-2 text-sm text-violet-900">
            {aviso.depoimento === "invalido" && aviso.msg ? aviso.msg : MENSAGENS_DEPOIMENTO[aviso.depoimento]}
          </p>
        )}
        {meuDepoimento && meuDepoimento.status !== "retirado" ? (
          <div className="mt-3 text-sm">
            <p className="text-neutral-600">
              {meuDepoimento.status === "aprovado"
                ? "Seu depoimento está publicado na página do Sou Bilíngue. Obrigado!"
                : meuDepoimento.status === "recusado"
                  ? "Seu depoimento não foi publicado."
                  : "Recebemos seu depoimento. Ele aparece na página depois de uma revisão."}
            </p>
            <blockquote className="mt-2 rounded-md bg-neutral-50 p-3 text-neutral-700">&ldquo;{meuDepoimento.texto}&rdquo;</blockquote>
            <form action={retirarMeuDepoimento} className="mt-3">
              <button type="submit" className="text-sm text-neutral-500 underline hover:text-neutral-800">
                Retirar minha autorização e remover o depoimento
              </button>
            </form>
          </div>
        ) : (
          <form action={enviarMeuDepoimento} className="mt-3 flex flex-col gap-3">
            <p className="text-sm text-neutral-500">
              Sua experiência ajuda outras pessoas a perderem o medo de falar. Escreva só se quiser, com as suas palavras.
            </p>
            <div>
              <label htmlFor="dep-nome" className="text-sm font-semibold">Como quer aparecer</label>
              <input id="dep-nome" name="nome" required maxLength={60} defaultValue={sessao.nome.split(/\s+/)[0]} className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label htmlFor="dep-contexto" className="text-sm font-semibold">Contexto (opcional)</label>
              <input id="dep-contexto" name="contexto" maxLength={80} placeholder="Ex.: aluna de inglês há 2 meses" className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label htmlFor="dep-texto" className="text-sm font-semibold">Seu depoimento</label>
              <textarea id="dep-texto" name="texto" required minLength={20} maxLength={500} rows={4} className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
            </div>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" name="autorizo" value="sim" required className="mt-1" />
              Autorizo o Sou Bilíngue a publicar este depoimento, com o nome e o contexto acima, na página do app. Posso retirar a autorização quando quiser.
            </label>
            <button type="submit" className="w-fit rounded-md bg-violet-700 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-800">
              Enviar depoimento
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
