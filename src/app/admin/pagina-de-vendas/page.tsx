import { getConteudoVendas, getResumoFunil } from "@/lib/data/vendas";
import { depoimentosParaTexto, perguntasParaTexto } from "@/lib/vendas/conteudo";
import { restaurarTextosPadrao, salvarPaginaDeVendas } from "./actions";

export const dynamic = "force-dynamic";

// Edição da página de vendas (docs/sales-page.md → Como editar). Preços e
// horas NÃO ficam aqui: vêm da tabela planos.
const ETAPAS_FUNIL: Array<[string, string]> = [
  ["pagina_vista", "Visitas"],
  ["cta_principal", "Cliques em \"começar\""],
  ["como_funciona", "Viram \"como funciona\""],
  ["planos_vistos", "Viram os planos"],
  ["plano_selecionado", "Escolheram um plano"],
  ["ida_ao_checkout", "Foram ao pagamento"],
  ["assistente_aberto", "Abriram o assistente de dúvidas"],
  ["assistente_pergunta", "Perguntas ao assistente"],
  ["compra_confirmada", "Compras confirmadas (webhook)"],
];

function Campo({ nome, rotulo, valor, max, ajuda, linhas }: { nome: string; rotulo: string; valor: string; max: number; ajuda?: string; linhas?: number }) {
  const comum = {
    id: nome,
    name: nome,
    defaultValue: valor,
    maxLength: max,
    className: "mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200",
  };
  return (
    <div>
      <label htmlFor={nome} className="text-sm font-semibold text-neutral-800">{rotulo}</label>
      {linhas ? <textarea {...comum} rows={linhas} /> : <input {...comum} type="text" />}
      {ajuda && <p className="mt-1 text-xs text-neutral-500">{ajuda}</p>}
    </div>
  );
}

export default async function PaginaDeVendasAdmin({
  searchParams,
}: {
  searchParams: Promise<{ salvo?: string; erro?: string; restaurado?: string }>;
}) {
  const [c, funil, aviso] = await Promise.all([getConteudoVendas(), getResumoFunil(30), searchParams]);
  const visitas = funil.pagina_vista ?? 0;
  const compras = funil.compra_confirmada ?? 0;

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <div>
        <span className="font-mono text-xs uppercase tracking-widest text-neutral-400">Página de vendas</span>
        <h1 className="mt-1 text-2xl font-bold">Textos, dúvidas e depoimentos</h1>
        <p className="mt-2 text-sm text-neutral-500">
          Preços e horas vêm dos planos cadastrados. Tudo aqui aparece como texto (sem HTML). Não publique depoimentos,
          números ou garantias que não sejam reais.
        </p>
        <a href="/" target="_blank" className="mt-2 inline-block text-sm font-semibold text-violet-700 hover:underline">
          Ver a página (abra numa aba anônima) ↗
        </a>
      </div>

      {aviso.salvo && <p role="status" className="rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Alterações salvas e publicadas.</p>}
      {aviso.restaurado && <p role="status" className="rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Textos padrão restaurados.</p>}
      {aviso.erro && <p role="alert" className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-800">Não foi possível salvar. Tente de novo.</p>}

      <section aria-labelledby="funil" className="rounded-lg border border-neutral-200 p-5">
        <h2 id="funil" className="font-bold">Funil dos últimos 30 dias</h2>
        {visitas === 0 ? (
          <p className="mt-2 text-sm text-neutral-500">Ainda sem visitas registradas.</p>
        ) : (
          <>
            <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {ETAPAS_FUNIL.map(([chave, rotulo]) => (
                <div key={chave} className="rounded-md bg-neutral-50 p-3">
                  <dt className="text-xs text-neutral-500">{rotulo}</dt>
                  <dd className="text-xl font-bold">{funil[chave] ?? 0}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-sm text-neutral-600">
              Conversão (compras confirmadas ÷ visitas): <strong>{((compras / visitas) * 100).toFixed(1)}%</strong>
            </p>
          </>
        )}
      </section>

      <form action={salvarPaginaDeVendas} className="flex flex-col gap-5">
        <fieldset className="flex flex-col gap-4 rounded-lg border border-neutral-200 p-5">
          <legend className="px-1 font-bold">Topo da página</legend>
          <Campo nome="heroSelo" rotulo="Selo acima do título" valor={c.heroSelo} max={80} />
          <Campo nome="heroTitulo" rotulo="Título" valor={c.heroTitulo} max={60} />
          <Campo nome="heroDestaque" rotulo="Final do título (em destaque colorido)" valor={c.heroDestaque} max={40} />
          <Campo nome="heroSubtitulo" rotulo="Subtítulo" valor={c.heroSubtitulo} max={320} linhas={3} />
          <Campo nome="avisoPromocional" rotulo="Faixa de aviso no topo (opcional)" valor={c.avisoPromocional} max={140} ajuda="Deixe vazio para não mostrar. Nada de urgência falsa." />
        </fieldset>

        <fieldset className="grid gap-4 rounded-lg border border-neutral-200 p-5 sm:grid-cols-2">
          <legend className="px-1 font-bold">Botões</legend>
          <Campo nome="ctaPrincipal" rotulo="Botão principal" valor={c.ctaPrincipal} max={40} />
          <Campo nome="ctaSecundario" rotulo={'Botão "como funciona"'} valor={c.ctaSecundario} max={40} />
          <Campo nome="ctaPlanos" rotulo={'Botão "ver planos"'} valor={c.ctaPlanos} max={40} />
          <Campo nome="ctaFinal" rotulo="Botão do final" valor={c.ctaFinal} max={40} />
        </fieldset>

        <fieldset className="flex flex-col gap-4 rounded-lg border border-neutral-200 p-5">
          <legend className="px-1 font-bold">Perguntas frequentes</legend>
          <Campo
            nome="perguntas"
            rotulo="Uma pergunta por bloco"
            valor={perguntasParaTexto(c.perguntas)}
            max={16000}
            linhas={14}
            ajuda="1ª linha = pergunta; linhas seguintes = resposta; deixe uma linha em branco entre as perguntas."
          />
        </fieldset>

        <fieldset className="flex flex-col gap-4 rounded-lg border border-neutral-200 p-5">
          <legend className="px-1 font-bold">Depoimentos manuais (só reais, com autorização)</legend>
          <p className="text-xs text-neutral-500">
            Os depoimentos enviados pelos alunos no app são aprovados em{" "}
            <a href="/admin/depoimentos" className="font-semibold text-violet-700 hover:underline">Depoimentos</a>. Use este
            campo só para depoimentos autorizados recebidos por outro canal.
          </p>
          <Campo
            nome="depoimentos"
            rotulo="Um depoimento por bloco"
            valor={depoimentosParaTexto(c.depoimentos)}
            max={8000}
            linhas={8}
            ajuda="1ª linha = Nome | contexto (ex.: Ana | aluna de inglês há 3 meses); linhas seguintes = texto. Vazio = a seção não aparece."
          />
        </fieldset>

        <fieldset className="flex flex-col gap-4 rounded-lg border border-neutral-200 p-5">
          <legend className="px-1 font-bold">Vídeo de uma aula real</legend>
          <Campo
            nome="videoAula"
            rotulo="Link do vídeo (YouTube ou Vimeo)"
            valor={c.videoAula}
            max={200}
            ajuda="Grave a tela de uma aula sua (com o áudio), publique no YouTube como 'Não listado' e cole o link. Vazio = a página mostra a demonstração animada."
          />
        </fieldset>

        <fieldset className="grid gap-4 rounded-lg border border-neutral-200 p-5 sm:grid-cols-2">
          <legend className="px-1 font-bold">Contato (página /contato e rodapé)</legend>
          <Campo nome="suporteEmail" rotulo="E-mail de suporte" valor={c.suporteEmail} max={120} />
          <Campo nome="suporteWhatsapp" rotulo="WhatsApp (com DDI e DDD)" valor={c.suporteWhatsapp} max={30} ajuda="Ex.: +55 11 99999-9999" />
          <Campo nome="horarioAtendimento" rotulo="Horário de atendimento" valor={c.horarioAtendimento} max={120} ajuda="Ex.: segunda a sexta, das 9h às 18h" />
          <Campo nome="empresaNome" rotulo="Nome empresarial (razão social)" valor={c.empresaNome} max={120} />
          <Campo nome="empresaCnpj" rotulo="CNPJ (ou CPF, se for pessoa física)" valor={c.empresaCnpj} max={20} />
          <Campo nome="empresaEndereco" rotulo="Endereço físico" valor={c.empresaEndereco} max={200} ajuda="O Decreto 7.962/2013 exige nome, CNPJ/CPF e endereço visíveis no site de venda." />
        </fieldset>

        <fieldset className="flex flex-col gap-2 rounded-lg border border-neutral-200 p-5">
          <legend className="px-1 font-bold">Assistente de dúvidas</legend>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" name="assistenteAtivo" value="sim" defaultChecked={c.assistenteAtivo} className="mt-1" />
            Mostrar o assistente (IA) na página de vendas, no cadastro, no checkout e no contato.
          </label>
          <p className="text-xs text-neutral-500">
            Ele responde só com as informações do app (planos do banco, perguntas frequentes e políticas). Cada pergunta consome
            créditos da Anthropic; desligue aqui se precisar.
          </p>
        </fieldset>

        <fieldset className="flex flex-col gap-4 rounded-lg border border-neutral-200 p-5">
          <legend className="px-1 font-bold">SEO e testes</legend>
          <Campo nome="seoTitulo" rotulo="Título no Google" valor={c.seoTitulo} max={70} />
          <Campo nome="seoDescricao" rotulo="Descrição no Google" valor={c.seoDescricao} max={170} linhas={2} />
          <Campo nome="variante" rotulo="Variante (rótulo para testes A/B futuros)" valor={c.variante} max={20} />
        </fieldset>

        <div className="flex flex-wrap gap-3">
          <button type="submit" className="rounded-md bg-violet-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-800 focus:outline-none focus-visible:ring-4 focus-visible:ring-violet-300">
            Salvar e publicar
          </button>
        </div>
      </form>

      <form action={restaurarTextosPadrao}>
        <button type="submit" className="text-sm text-neutral-500 underline hover:text-neutral-800">
          Restaurar textos padrão
        </button>
      </form>
    </div>
  );
}
