import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Animacoes } from "@/components/vendas/Animacoes";
import { ComoFunciona } from "@/components/vendas/ComoFunciona";
import { CtaFixoMobile } from "@/components/vendas/CtaFixoMobile";
import { DemoConversa } from "@/components/vendas/DemoConversa";
import { VideoAula } from "@/components/vendas/VideoAula";
import { Rastreador } from "@/components/vendas/Rastreador";
import { getSessao, rotaDoPapel } from "@/lib/auth/guards";
import { getPlanos } from "@/lib/billing/subscription";
import {
  DESCONTO_PRIMEIRA_MENSALIDADE,
  PLANO_RECOMENDADO,
  PLANOS_DE_TESTE,
  formatarPreco,
  horasPorSemana,
  nomeDeExibicao,
  planoTemVozPremium,
  publicoDoPlano,
  valorPrimeiraMensalidade,
} from "@/lib/billing/planos";
import { getDepoimentosPublicados } from "@/lib/data/depoimentos";
import { getConteudoVendas } from "@/lib/data/vendas";
import { videoIncorporado } from "@/lib/vendas/conteudo";

// Página de vendas — estrutura e regras em docs/sales-page.md.
// Textos editáveis: /admin/pagina-de-vendas. Preços e horas: tabela planos.

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const c = await getConteudoVendas();
  return {
    title: c.seoTitulo,
    description: c.seoDescricao,
    openGraph: { title: c.seoTitulo, description: c.seoDescricao, type: "website", locale: "pt_BR", siteName: "Sou Bilíngue" },
  };
}

const CADASTRO = "/cadastro";

const TUTORES = [
  { nome: "Clara", foto: "/tutores/anime/clara.png", perfil: "Adulta, calorosa" },
  { nome: "Seu Antônio", foto: "/tutores/anime/antonio.png", perfil: "Sereno, bem-humorado" },
  { nome: "Mei", foto: "/tutores/anime/mei.png", perfil: "Jovem, leve" },
  { nome: "Diego", foto: "/tutores/anime/diego.png", perfil: "Jovem, comunicativo" },
  { nome: "Luna", foto: "/tutores/anime/luna.png", perfil: "Para crianças" },
  { nome: "Theo", foto: "/tutores/anime/theo.png", perfil: "Para crianças" },
];

const OBJECOES = [
  { dor: "Tenho vergonha de falar.", resposta: "Aqui não tem plateia: é você e um professor paciente, que nunca te constrange por errar." },
  { dor: "Não tenho tempo.", resposta: "A aula acontece quando você puder, a qualquer hora, em sessões do tamanho da sua rotina." },
  { dor: "Já tentei outros apps e não evoluí.", resposta: "Exercício solto não ensina a conversar. Aqui você fala de verdade, sobre o que gosta." },
  { dor: "Meu nível é muito baixo.", resposta: "A conversa começa em português e o idioma entra aos poucos, no seu ritmo." },
  { dor: "Não sei por onde começar.", resposta: "Uma entrevista curta monta seu perfil e o professor sugere o primeiro assunto." },
  { dor: "Não consigo manter a rotina.", resposta: "Metas semanais e um certificado mensal verificável ajudam a manter a constância." },
];

const BENEFICIOS = [
  { icone: "🎯", titulo: "Aulas sobre o que você gosta", texto: "Viagens, games, trabalho, séries: os exemplos saem dos seus interesses." },
  { icone: "🗣️", titulo: "Conversação de verdade", texto: "Você fala por voz e ouve as respostas — pratica pronúncia e escuta ao mesmo tempo." },
  { icone: "🤝", titulo: "Correção respeitosa", texto: "Na hora, no fim da frase ou só no final: você escolhe como quer ser corrigido." },
  { icone: "🛟", titulo: "Seguro para errar", texto: "Travou? Vem uma pista ou duas opções. Errar faz parte e é tratado assim." },
  { icone: "⏱️", titulo: "No seu horário", texto: "Sem agenda fixa: pratique de manhã, no almoço ou à noite, no celular ou no computador." },
  { icone: "📈", titulo: "Evolução acompanhada", texto: "Horas praticadas, constância semanal e dificuldade que sobe aos poucos." },
  { icone: "🏅", titulo: "Certificado mensal", texto: "Cumpriu a meta de todas as semanas do mês? Ganha um certificado com código de verificação." },
  { icone: "➕", titulo: "Horas extras quando quiser", texto: "Precisa praticar mais num mês? Compre horas extras direto no app." },
];

const COMPARACAO: Array<{ item: string; sb: string; curso: string; app: string }> = [
  { item: "Horário", sb: "Quando você quiser", curso: "Turma com horário fixo", app: "Quando você quiser" },
  { item: "Conversa por voz", sb: "Em toda aula", curso: "Divide o tempo com a turma", app: "Pouca ou nenhuma" },
  { item: "Assuntos da aula", sb: "Seus interesses e objetivos", curso: "Apostila da turma", app: "Trilha igual para todos" },
  { item: "Jeito de corrigir", sb: "Você escolhe", curso: "Depende do professor", app: "Certo ou errado" },
  { item: "Falar sem plateia", sb: "Sim", curso: "Não", app: "Sim" },
  { item: "Professor humano", sb: "Não — professor virtual", curso: "Sim", app: "Não" },
];

function Cta({
  children,
  evento = "cta_principal",
  secundario = false,
  href = CADASTRO,
  className = "",
}: {
  children: React.ReactNode;
  evento?: string;
  secundario?: boolean;
  href?: string;
  className?: string;
}) {
  const interno = href.startsWith("#");
  return (
    <a
      href={href}
      data-evento={evento}
      {...(interno ? {} : { "data-campanha": "" })}
      className={`${secundario ? "vendas-cta-secundario" : "vendas-cta"} ${className}`}
    >
      {children}
    </a>
  );
}

function Titulo({ selo, children, sub, claro = false }: { selo: string; children: React.ReactNode; sub?: string; claro?: boolean }) {
  return (
    <div className="mx-auto mb-12 max-w-2xl text-center">
      <span className={claro ? "inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-extrabold uppercase tracking-[0.14em] text-fuchsia-200" : "vendas-selo"}>{selo}</span>
      <h2 className={`mt-4 text-3xl font-black tracking-tight sm:text-4xl ${claro ? "text-white" : "text-slate-900"}`}>{children}</h2>
      {sub && <p className={`mt-4 text-lg leading-relaxed ${claro ? "text-slate-300" : "text-slate-600"}`}>{sub}</p>}
    </div>
  );
}

export default async function PaginaDeVendas() {
  const sessao = await getSessao();
  if (sessao) redirect(rotaDoPapel(sessao.papel));

  const [c, planosDoBanco, aprovados] = await Promise.all([getConteudoVendas(), getPlanos(), getDepoimentosPublicados()]);
  // Depoimentos: os enviados pelos alunos e aprovados + os manuais do admin.
  const depoimentos = [...aprovados, ...c.depoimentos].slice(0, 9);
  const video = c.videoAula ? videoIncorporado(c.videoAula) : null;
  const planos = planosDoBanco
    .filter((p) => !PLANOS_DE_TESTE.has(p.nome))
    .map((p) => ({
      id: p.nome,
      nome: nomeDeExibicao(p.nome),
      publico: publicoDoPlano(p.nome),
      preco: Number(p.preco),
      primeira: valorPrimeiraMensalidade(Number(p.preco), p.nome),
      horas: p.horas_mensais,
      voz: planoTemVozPremium(p.nome) ? "Voz premium do professor (mais natural)" : "Voz padrão do navegador",
      recomendado: p.nome === PLANO_RECOMENDADO,
    }));
  const menorPrimeira = planos.length ? Math.min(...planos.map((p) => p.primeira)) : null;
  const whatsapp = c.suporteWhatsapp ? `https://wa.me/${c.suporteWhatsapp}` : "";

  return (
    <div className="min-h-screen bg-[#f6f4ff] text-slate-900">
      <Rastreador />
      <Animacoes />

      {c.avisoPromocional && (
        <p className="bg-gradient-to-r from-violet-700 via-fuchsia-600 to-indigo-700 px-4 py-2 text-center text-sm font-bold text-white">
          {c.avisoPromocional}
        </p>
      )}

      {/* ================= HERO (escuro) ================= */}
      <header className="relative overflow-hidden bg-[radial-gradient(ellipse_at_top_right,_#4c1d95_0%,_#1e1b4b_45%,_#070a1f_100%)] text-white">
        <div aria-hidden className="pointer-events-none absolute -left-32 top-20 h-96 w-96 rounded-full bg-fuchsia-600/30 blur-3xl brilho-lento" data-parallax="0.08" />
        <div aria-hidden className="pointer-events-none absolute right-0 top-0 h-[28rem] w-[28rem] rounded-full bg-indigo-500/30 blur-3xl brilho-lento" data-parallax="0.12" />

        <nav className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8" aria-label="Principal">
          <Link href="/" className="flex items-center gap-3 focus:outline-none focus-visible:ring-4 focus-visible:ring-fuchsia-300/60 rounded-xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon.svg" alt="" width={40} height={40} className="h-10 w-10" />
            <span className="text-lg font-black tracking-tight">Sou Bilíngue</span>
          </Link>
          <div className="hidden items-center gap-7 text-sm font-semibold text-slate-300 md:flex">
            <a href="#como-funciona" data-evento="como_funciona" className="hover:text-white">Como funciona</a>
            <a href="#planos" className="hover:text-white">Planos</a>
            <a href="#perguntas" className="hover:text-white">Dúvidas</a>
          </div>
          <a href="/login" className="rounded-xl border border-white/25 px-4 py-2 text-sm font-bold hover:bg-white/10 focus:outline-none focus-visible:ring-4 focus-visible:ring-white/40">
            Entrar
          </a>
        </nav>

        <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 px-5 pb-24 pt-8 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:pb-32 lg:pt-14">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-bold text-fuchsia-200 backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-emerald-400" /> {c.heroSelo}
            </span>
            <h1 className="mt-6 text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              {c.heroTitulo}{" "}
              <span className="bg-gradient-to-r from-cyan-300 via-violet-300 to-fuchsia-400 bg-clip-text text-transparent">{c.heroDestaque}</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-300">{c.heroSubtitulo}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Cta className="vendas-cta-destaque">{c.ctaPrincipal} →</Cta>
              <Cta secundario href="#como-funciona" evento="como_funciona">{c.ctaSecundario}</Cta>
            </div>
            <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-300">
              {menorPrimeira !== null && (
                <li>✓ 1º mês com {DESCONTO_PRIMEIRA_MENSALIDADE}% de desconto — a partir de {formatarPreco(menorPrimeira)}</li>
              )}
              <li>✓ Cancele quando quiser, pelo próprio app</li>
              <li>✓ Pagamento seguro pelo Asaas</li>
              <li>✓ Funciona no navegador do celular</li>
            </ul>
          </div>

          {/* Professor virtual + elementos flutuantes */}
          <div className="relative mx-auto w-full max-w-lg">
            <div aria-hidden className="absolute inset-6 rounded-[2.5rem] bg-gradient-to-br from-cyan-400/40 via-violet-500/40 to-fuchsia-500/40 blur-2xl" />
            <div className="relative overflow-hidden rounded-[2.5rem] border border-white/15 bg-white/5 shadow-2xl backdrop-blur flutuar-lento">
              <Image
                src="/tutores/anime/clara.png"
                alt="Clara, uma das professoras virtuais do Sou Bilíngue, em estilo de ilustração"
                width={1652}
                height={952}
                priority
                sizes="(max-width: 1024px) 90vw, 512px"
                className="aspect-[4/3] w-full object-cover object-[50%_30%]"
              />
              <div className="absolute inset-x-4 bottom-4 rounded-2xl bg-slate-950/80 p-3 text-sm backdrop-blur">
                <p className="text-xs font-bold text-fuchsia-300">Clara · professora virtual</p>
                <p className="mt-1 text-slate-100">&quot;Pode responder com calma. Errar faz parte — eu te ajudo.&quot;</p>
              </div>
            </div>
            <span aria-hidden className="absolute left-1 top-8 sm:-left-4 rounded-2xl bg-white px-3 py-2 text-sm font-bold text-violet-700 shadow-xl flutuar [--giro:-6deg]">Hello! 👋</span>
            <span aria-hidden className="absolute right-1 top-24 sm:-right-3 rounded-2xl bg-gradient-to-r from-cyan-400 to-violet-500 px-3 py-2 text-sm font-bold text-white shadow-xl flutuar-lento [--giro:5deg]">¡Hola!</span>
            <span aria-hidden className="absolute left-1 bottom-28 sm:-left-6 rounded-2xl bg-white/10 px-3 py-2 text-sm font-bold text-white shadow-xl backdrop-blur flutuar [--giro:4deg]">🎙️ ouvindo…</span>
            <span aria-hidden className="absolute right-1 bottom-40 sm:-right-5 rounded-2xl bg-emerald-400 px-3 py-2 text-sm font-bold text-emerald-950 shadow-xl flutuar-lento [--giro:-4deg]">✓ frase certa!</span>
            <span aria-hidden className="absolute right-10 -top-4 rounded-2xl bg-fuchsia-500 px-3 py-2 text-sm font-bold text-white shadow-xl flutuar [--giro:8deg]">Bonjour</span>
          </div>
        </div>
        <div aria-hidden className="h-16 bg-gradient-to-b from-transparent to-[#f6f4ff]" />
      </header>

      <main>
        {/* ================= BARRA DE CONFIANÇA ================= */}
        <section aria-label="O que você encontra" className="relative z-10 mx-auto -mt-20 max-w-6xl px-5 sm:px-8">
          <ul className="grid grid-cols-2 gap-3 rounded-3xl bg-white p-4 shadow-xl ring-1 ring-violet-100 sm:grid-cols-3 lg:grid-cols-5 sm:p-6">
            {[
              ["5", "idiomas: inglês, espanhol, francês, italiano e mandarim"],
              ["6", "professores virtuais com jeitos diferentes"],
              ["🎙️", "aula por voz, no celular ou computador"],
              ["🏅", "certificado mensal verificável"],
              ["🤝", "correção gentil, do jeito que você escolhe"],
            ].map(([n, t]) => (
              <li key={t} className="flex items-center gap-3 rounded-2xl px-2 py-1">
                <span className="text-2xl font-black text-violet-700">{n}</span>
                <span className="text-sm leading-snug text-slate-600">{t}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* ================= PROBLEMAS ================= */}
        <section className="mx-auto max-w-6xl px-5 py-24 sm:px-8" data-revelar>
          <Titulo selo="Você não está sozinho" sub="Quase todo mundo que estuda um idioma trava nos mesmos pontos. O Sou Bilíngue foi pensado para eles.">
            Parece com você?
          </Titulo>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {OBJECOES.map((o) => (
              <li key={o.dor} className="vendas-cartao">
                <p className="text-lg font-black text-slate-900">&quot;{o.dor}&quot;</p>
                <p className="mt-2 text-slate-600">{o.resposta}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* ================= SOLUÇÃO ================= */}
        <section className="bg-white py-24" data-revelar>
          <div className="mx-auto max-w-6xl px-5 sm:px-8">
            <Titulo selo="A solução" sub="Um professor virtual que conversa por voz com você, conhece seus objetivos e adapta cada aula. Escolha quem vai te acompanhar.">
              Seu professor de idiomas, disponível quando você precisar
            </Titulo>
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {TUTORES.map((t) => (
                <li key={t.nome} className="group overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950 to-violet-900 shadow-lg transition hover:-translate-y-1">
                  <Image src={t.foto} alt={`${t.nome}, professor virtual`} width={1652} height={952} loading="lazy" sizes="(max-width: 640px) 45vw, 180px" className="aspect-square w-full object-cover object-[50%_25%]" />
                  <div className="p-3 text-white">
                    <p className="font-bold">{t.nome}</p>
                    <p className="text-xs text-violet-200">{t.perfil}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ================= COMO FUNCIONA ================= */}
        <section id="como-funciona" className="mx-auto max-w-6xl scroll-mt-8 px-5 py-24 sm:px-8" data-revelar>
          <Titulo selo="Como funciona" sub="Do primeiro acesso à aula de hoje, em seis passos.">Aprenda conversando, do seu jeito</Titulo>
          <ComoFunciona />
          <div className="mt-10 text-center">
            <Cta>Quero falar com confiança →</Cta>
          </div>
        </section>

        {/* ================= BENEFÍCIOS ================= */}
        <section className="bg-white py-24" data-revelar>
          <div className="mx-auto max-w-6xl px-5 sm:px-8">
            <Titulo selo="Benefícios">O que muda na sua forma de aprender</Titulo>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {BENEFICIOS.map((b) => (
                <li key={b.titulo} className="vendas-cartao">
                  <span aria-hidden className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-100 to-fuchsia-100 text-2xl">{b.icone}</span>
                  <h3 className="mt-4 font-black text-slate-900">{b.titulo}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{b.texto}</p>
                </li>
              ))}
            </ul>
            <div className="mt-10 text-center">
              <Cta>Experimentar o Sou Bilíngue →</Cta>
            </div>
          </div>
        </section>

        {/* ================= PERSONALIZAÇÃO + DEMONSTRAÇÃO (escuro) ================= */}
        <section className="relative overflow-hidden bg-[radial-gradient(ellipse_at_bottom_left,_#4c1d95_0%,_#1e1b4b_50%,_#070a1f_100%)] py-24 text-white" data-revelar>
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 sm:px-8 lg:grid-cols-2">
            <div>
              <Titulo claro selo="Personalização" sub="Na entrevista de boas-vindas você responde algumas perguntas. Veja como isso muda a aula.">
                Cada aula feita para você
              </Titulo>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-3xl bg-white/5 p-5 ring-1 ring-white/10">
                  <p className="text-xs font-bold uppercase tracking-wider text-fuchsia-300">Você contou</p>
                  <ul className="mt-3 space-y-2 text-sm text-slate-200">
                    <li>• Me chame de Ju</li>
                    <li>• Nível: iniciante</li>
                    <li>• Gosto de viagens e música</li>
                    <li>• Corrija no fim da frase</li>
                  </ul>
                </div>
                <div className="rounded-3xl bg-gradient-to-br from-violet-600/40 to-fuchsia-600/30 p-5 ring-1 ring-fuchsia-300/30">
                  <p className="text-xs font-bold uppercase tracking-wider text-cyan-200">A aula faz</p>
                  <ul className="mt-3 space-y-2 text-sm text-white">
                    <li>• Te chama pelo nome certo</li>
                    <li>• Começa em português</li>
                    <li>• Simula situações de viagem</li>
                    <li>• Espera você terminar para corrigir</li>
                  </ul>
                </div>
              </div>
            </div>
            <div>
              {video ? <VideoAula video={video} titulo="Uma aula real no Sou Bilíngue" /> : <DemoConversa nomeTutor="Clara" fotoTutor="/tutores/anime/clara.png" />}
              <div className="mt-6 text-center lg:text-left">
                <Cta>Começar minha jornada →</Cta>
              </div>
            </div>
          </div>
        </section>

        {/* ================= COMPARAÇÃO ================= */}
        <section className="mx-auto max-w-6xl px-5 py-24 sm:px-8" data-revelar>
          <Titulo selo="Comparação" sub="Cada formato tem seu lugar. Veja onde o Sou Bilíngue se encaixa.">Diferente do que você já tentou</Titulo>
          <div className="overflow-x-auto rounded-3xl bg-white shadow-xl ring-1 ring-violet-100">
            <table className="w-full min-w-[640px] text-left text-sm">
              <caption className="sr-only">Comparação entre o Sou Bilíngue, cursos tradicionais e apps de exercícios</caption>
              <thead>
                <tr className="border-b border-violet-100">
                  <th scope="col" className="p-4 font-bold text-slate-500">&nbsp;</th>
                  <th scope="col" className="bg-violet-50 p-4 font-black text-violet-800">Sou Bilíngue</th>
                  <th scope="col" className="p-4 font-bold text-slate-700">Curso em turma</th>
                  <th scope="col" className="p-4 font-bold text-slate-700">App de exercícios</th>
                </tr>
              </thead>
              <tbody>
                {COMPARACAO.map((l) => (
                  <tr key={l.item} className="border-b border-violet-50 last:border-0">
                    <th scope="row" className="p-4 font-bold text-slate-900">{l.item}</th>
                    <td className="bg-violet-50 p-4 font-semibold text-violet-900">{l.sb}</td>
                    <td className="p-4 text-slate-600">{l.curso}</td>
                    <td className="p-4 text-slate-600">{l.app}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ================= DEPOIMENTOS (só com conteúdo real) ================= */}
        {depoimentos.length > 0 && (
          <section className="bg-white py-24" data-revelar>
            <div className="mx-auto max-w-6xl px-5 sm:px-8">
              <Titulo selo="Quem já pratica">O que dizem nossos alunos</Titulo>
              <ul className="grid gap-4 md:grid-cols-3">
                {depoimentos.map((d, i) => (
                  <li key={i} className="vendas-cartao">
                    <p aria-hidden className="text-4xl font-black leading-none text-fuchsia-300">&ldquo;</p>
                    <blockquote className="mt-2 text-slate-700">{d.texto}</blockquote>
                    <p className="mt-4 font-bold text-slate-900">{d.nome}</p>
                    {d.contexto && <p className="text-sm text-slate-500">{d.contexto}</p>}
                  </li>
                ))}
              </ul>
              <div className="mt-10 text-center">
                <Cta>Quero começar também →</Cta>
              </div>
            </div>
          </section>
        )}

        {/* ================= EVOLUÇÃO ================= */}
        <section className="mx-auto max-w-6xl px-5 py-24 sm:px-8" data-revelar>
          <Titulo selo="Sua evolução" sub="Sem promessas mágicas: você evolui praticando, e o app mostra essa prática com clareza.">
            Acompanhe cada passo
          </Titulo>
          <ol className="grid gap-4 md:grid-cols-4">
            {[
              ["Primeira aula", "Conversa no seu nível, com o professor que você escolheu."],
              ["Toda semana", "Suas horas e sua constância ficam registradas no painel."],
              ["Aos poucos", "A dificuldade sobe conforme você acerta, sem pular etapas."],
              ["Todo mês", "Meta cumprida em todas as semanas vira certificado verificável."],
            ].map(([t, d], i) => (
              <li key={t} className="vendas-cartao">
                <span className="text-sm font-black text-fuchsia-600">0{i + 1}</span>
                <h3 className="mt-2 font-black text-slate-900">{t}</h3>
                <p className="mt-2 text-sm text-slate-600">{d}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* ================= PLANOS ================= */}
        <section id="planos" className="scroll-mt-8 bg-white py-24" data-revelar>
          <div className="mx-auto max-w-6xl px-5 sm:px-8">
            <Titulo
              selo="Planos e preços"
              sub={`Cobrança mensal automática. O 1º mês sai com ${DESCONTO_PRIMEIRA_MENSALIDADE}% de desconto; do 2º mês em diante vale o preço cheio.`}
            >
              Escolha como quer praticar
            </Titulo>
            {planos.length === 0 ? (
              <p className="rounded-3xl bg-violet-50 p-8 text-center text-slate-600">
                Não foi possível carregar os planos agora. Atualize a página em instantes.
              </p>
            ) : (
              <ul className="grid gap-6 md:grid-cols-3">
                {planos.map((p) => (
                  <li
                    key={p.id}
                    className={`relative flex flex-col rounded-3xl p-7 transition duration-300 hover:-translate-y-1 ${
                      p.recomendado
                        ? "bg-gradient-to-b from-indigo-950 via-violet-900 to-fuchsia-900 text-white shadow-2xl ring-2 ring-fuchsia-400"
                        : "bg-white shadow-xl ring-1 ring-violet-100"
                    }`}
                  >
                    {p.recomendado && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500 px-4 py-1 text-xs font-black text-white shadow-lg">
                        Recomendado
                      </span>
                    )}
                    <h3 className="text-2xl font-black">{p.nome}</h3>
                    <p className={`mt-1 text-sm ${p.recomendado ? "text-violet-200" : "text-slate-500"}`}>{p.publico}</p>
                    <div className="mt-6">
                      <p className={`text-xs font-bold uppercase tracking-wider ${p.recomendado ? "text-emerald-300" : "text-emerald-700"}`}>1º mês</p>
                      <p className="text-4xl font-black">
                        {formatarPreco(p.primeira)}
                        {p.primeira < p.preco && (
                          <span className={`ml-2 align-middle text-base font-semibold line-through ${p.recomendado ? "text-violet-300" : "text-slate-400"}`}>
                            {formatarPreco(p.preco)}
                          </span>
                        )}
                      </p>
                      <p className={`mt-1 text-sm ${p.recomendado ? "text-violet-200" : "text-slate-500"}`}>depois {formatarPreco(p.preco)}/mês</p>
                    </div>
                    <ul className={`mt-6 flex-1 space-y-2 text-sm ${p.recomendado ? "text-slate-100" : "text-slate-700"}`}>
                      <li>✓ {p.horas} horas de conversa por mês ({horasPorSemana(p.horas)})</li>
                      <li>✓ {p.voz}</li>
                      <li>✓ Perfil personalizado e 6 professores virtuais</li>
                      <li>✓ 5 idiomas para escolher</li>
                      <li>✓ Certificado mensal verificável</li>
                      <li>✓ Horas extras disponíveis para compra</li>
                    </ul>
                    <a
                      href={`${CADASTRO}?plano=${p.id}`}
                      data-evento="plano_selecionado"
                      data-plano={p.id}
                      data-campanha
                      className={`mt-8 ${p.recomendado ? "vendas-cta" : "vendas-cta-secundario !border-violet-200 !bg-violet-50 !text-violet-800 hover:!bg-violet-100"}`}
                    >
                      Quero o {p.nome}
                    </a>
                  </li>
                ))}
              </ul>
            )}
            <p className="mx-auto mt-8 max-w-3xl text-center text-sm text-slate-500">
              O próximo passo é criar sua conta e pagar na página segura do Asaas (Pix, cartão ou boleto). Depois, uma
              entrevista curta personaliza suas aulas. O acesso é liberado assim que o pagamento é confirmado, e você pode
              cancelar quando quiser pelo próprio app. Arrependeu-se? Em até 7 dias após o 1º pagamento, o reembolso é
              integral, pedido pelo app.
            </p>
          </div>
        </section>

        {/* ================= SEM SURPRESAS ================= */}
        <section className="mx-auto max-w-6xl px-5 py-24 sm:px-8" data-revelar>
          <Titulo selo="Sem surpresas">Transparente do começo ao fim</Titulo>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["💳", "Pagamento seguro", "Feito na página do Asaas. Não recebemos nem guardamos dados do seu cartão."],
              ["🏷️", `1º mês com ${DESCONTO_PRIMEIRA_MENSALIDADE}% off`, "O desconto aparece antes de pagar; os meses seguintes têm o preço cheio informado."],
              ["🔒", "Seus dados protegidos", "Pedimos só o necessário e cada aluno acessa apenas os próprios dados."],
              ["✋", "Cancele pelo app", "Sem ligação e sem letra miúda: as cobranças seguintes param na hora e o acesso vai até o fim do período pago. Em até 7 dias após o 1º pagamento, reembolso integral."],
            ].map(([i, t, d]) => (
              <li key={t} className="vendas-cartao">
                <span aria-hidden className="text-3xl">{i}</span>
                <h3 className="mt-3 font-black text-slate-900">{t}</h3>
                <p className="mt-2 text-sm text-slate-600">{d}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* ================= PERGUNTAS ================= */}
        <section id="perguntas" className="scroll-mt-8 bg-white py-24" data-revelar>
          <div className="mx-auto max-w-3xl px-5 sm:px-8">
            <Titulo selo="Dúvidas">Perguntas frequentes</Titulo>
            <div className="space-y-3">
              {c.perguntas.map((q) => (
                <details key={q.pergunta} className="group rounded-2xl bg-[#f6f4ff] p-5 ring-1 ring-violet-100 open:bg-white open:shadow-lg">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold text-slate-900 focus:outline-none focus-visible:ring-4 focus-visible:ring-violet-300 rounded-xl [&::-webkit-details-marker]:hidden">
                    {q.pergunta}
                    <span aria-hidden className="text-xl text-violet-600 transition group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-3 leading-relaxed text-slate-600">{q.resposta}</p>
                </details>
              ))}
            </div>
            <div className="mt-10 text-center">
              <Cta href="#planos" evento="cta_principal">{c.ctaPlanos}</Cta>
            </div>
          </div>
        </section>

        {/* ================= CTA FINAL ================= */}
        <section className="px-5 py-24 sm:px-8" data-revelar>
          <div className="relative mx-auto max-w-5xl overflow-hidden rounded-[2.5rem] bg-[radial-gradient(ellipse_at_top,_#7c3aed_0%,_#312e81_55%,_#0b1026_100%)] px-6 py-16 text-center text-white shadow-2xl sm:px-12">
            <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-56 w-56 rounded-full bg-fuchsia-500/40 blur-3xl brilho-lento" />
            <h2 className="relative text-3xl font-black sm:text-4xl">Sua próxima conversa pode ser em outro idioma.</h2>
            <p className="relative mx-auto mt-4 max-w-xl text-lg text-violet-100">
              Crie sua conta, conte seus objetivos e comece a praticar com um professor que respeita o seu ritmo.
            </p>
            <div className="relative mt-8">
              <Cta className="vendas-cta-destaque">{c.ctaFinal} →</Cta>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-[#070a1f] px-5 py-12 text-slate-400 sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon.svg" alt="" width={36} height={36} className="h-9 w-9" loading="lazy" />
            <span className="font-black text-white">Sou Bilíngue</span>
          </div>
          <nav aria-label="Rodapé" className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
            <a href="/termos" className="hover:text-white">Termos de uso</a>
            <a href="/privacidade" className="hover:text-white">Privacidade</a>
            {c.suporteEmail && <a href={`mailto:${c.suporteEmail}`} className="hover:text-white">Suporte: {c.suporteEmail}</a>}
            {whatsapp && <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="hover:text-white">WhatsApp do suporte</a>}
          </nav>
        </div>
        <p className="mx-auto mt-10 max-w-6xl text-xs">© {new Date().getFullYear()} Sou Bilíngue. Professores virtuais com inteligência artificial.</p>
      </footer>

      <CtaFixoMobile texto={c.ctaPrincipal} href={CADASTRO} />
    </div>
  );
}
