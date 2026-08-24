import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessao, rotaDoPapel } from "@/lib/auth/guards";

export default async function Home() {
  const sessao = await getSessao();
  if (sessao) redirect(rotaDoPapel(sessao.papel));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center text-white font-bold text-lg">
              SB
            </div>
            <h1 className="text-xl font-bold text-white">SouBilingue</h1>
          </div>
          <Link
            href="/login"
            className="px-6 py-2 rounded-lg text-white border border-slate-600 hover:bg-slate-800 transition-colors"
          >
            Entrar
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20">
                <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                <span className="text-sm text-blue-400">Novo jeito de aprender idiomas</span>
              </div>

              <h2 className="text-5xl lg:text-6xl font-bold text-white leading-tight">
                Fale <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">qualquer idioma</span> com confiança
              </h2>

              <p className="text-xl text-slate-300 leading-relaxed">
                Aulas com IA adaptadas ao seu nível. Aprenda conversando. Ganhe certificado todo mês quando cumprir sua meta.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Link
                  href="/cadastro"
                  className="px-8 py-4 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold hover:shadow-lg hover:shadow-blue-500/50 transition-all text-center"
                >
                  Começar Gratuitamente
                </Link>
                <Link
                  href="#planos"
                  className="px-8 py-4 rounded-lg border border-slate-600 text-white font-semibold hover:bg-slate-800/50 transition-colors text-center"
                >
                  Ver Planos
                </Link>
              </div>

              <div className="flex gap-8 pt-6 text-sm text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="text-blue-400">✓</span> 7 dias grátis
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-blue-400">✓</span> Sem cartão
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-blue-400">✓</span> Cancele quando quiser
                </div>
              </div>
            </div>

            {/* Right Visual */}
            <div className="relative h-96 lg:h-full min-h-96">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-3xl blur-3xl"></div>
              <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl border border-slate-700/50 p-8 space-y-4 flex items-center justify-center min-h-96">
                <div className="text-center space-y-6">
                  <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center text-4xl">
                    🤖
                  </div>
                  <div className="space-y-2">
                    <p className="text-slate-400 text-sm">Seu tutor de IA te esperando</p>
                    <p className="text-white font-semibold">Conversas reais, progresso real</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Idiomas */}
      <section className="py-16 px-6 border-t border-slate-700/50">
        <div className="max-w-7xl mx-auto">
          <h3 className="text-center text-slate-400 text-sm uppercase tracking-wider mb-10">Escolha seu idioma</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { flag: "🇪🇸", name: "Espanhol" },
              { flag: "🇫🇷", name: "Francês" },
              { flag: "🇬🇧", name: "Inglês" },
              { flag: "🇨🇳", name: "Mandarim" },
              { flag: "🇮🇹", name: "Italiano" },
            ].map((lang) => (
              <div key={lang.name} className="text-center p-6 rounded-lg border border-slate-700 hover:border-blue-500/50 hover:bg-slate-800/50 transition-all cursor-pointer">
                <div className="text-4xl mb-2">{lang.flag}</div>
                <p className="text-white font-medium">{lang.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <h3 className="text-3xl font-bold text-white text-center mb-16">Por que escolher SouBilingue?</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: "🎓",
                title: "Certificado Mensal",
                desc: "Ganhe certificado verificável quando cumprir sua meta de aulas no mês",
              },
              {
                icon: "🤖",
                title: "IA Personalizada",
                desc: "Tutor de IA que se adapta ao seu nível e estilo de aprendizado",
              },
              {
                icon: "🎯",
                title: "Metas Claras",
                desc: "Saiba exatamente quantas aulas você precisa fazer cada semana",
              },
              {
                icon: "🗣️",
                title: "Foco em Conversação",
                desc: "Aprenda falando de verdade com um tutor que entende sua pronúncia",
              },
              {
                icon: "📱",
                title: "Qualquer Lugar",
                desc: "Aulas no browser ou app — escolha o horário que melhor se encaixa",
              },
              {
                icon: "⚡",
                title: "Progresso Rápido",
                desc: "Método comprovado que acelera seu progresso na fluência",
              },
            ].map((feature, i) => (
              <div key={i} className="p-8 rounded-xl border border-slate-700 bg-slate-800/30 hover:bg-slate-800/60 transition-colors">
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h4 className="text-lg font-bold text-white mb-2">{feature.title}</h4>
                <p className="text-slate-400">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Planos */}
      <section id="planos" className="py-20 px-6 border-t border-slate-700/50">
        <div className="max-w-7xl mx-auto">
          <h3 className="text-3xl font-bold text-white text-center mb-4">Planos Simples e Claros</h3>
          <p className="text-center text-slate-400 mb-16 text-lg">Primeiro mês com 50% de desconto. Sem compromisso.</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                name: "Básico",
                price: "R$ 24,50",
                original: "R$ 49",
                days: "3 dias/semana",
                hours: "6 horas/semana",
                level: "A1 - A2",
                badge: false,
              },
              {
                name: "Intermediário",
                price: "R$ 39,50",
                original: "R$ 79",
                days: "5 dias/semana",
                hours: "10 horas/semana",
                level: "B1 - B2",
                badge: true,
              },
              {
                name: "Avançado",
                price: "R$ 59,50",
                original: "R$ 119",
                days: "7 dias/semana",
                hours: "14 horas/semana",
                level: "C1+",
                badge: false,
              },
            ].map((plan, i) => (
              <div
                key={i}
                className={`relative rounded-2xl border p-8 transition-all ${
                  plan.badge
                    ? "bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/50 ring-2 ring-blue-500/30"
                    : "bg-slate-800/30 border-slate-700"
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="px-4 py-1 bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-xs font-bold rounded-full">
                      Mais Popular
                    </span>
                  </div>
                )}

                <h4 className="text-2xl font-bold text-white mb-2">{plan.name}</h4>
                <div className="mb-6">
                  <div className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
                    {plan.price}
                    <span className="text-base text-slate-400 line-through ml-2">{plan.original}</span>
                  </div>
                  <p className="text-sm text-slate-400 mt-2">Próximas mensalidades: {plan.original}</p>
                </div>

                <div className="space-y-3 mb-8">
                  <div className="flex items-center gap-3">
                    <span className="text-blue-400">✓</span>
                    <span className="text-slate-300">{plan.days}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-blue-400">✓</span>
                    <span className="text-slate-300">{plan.hours}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-blue-400">✓</span>
                    <span className="text-slate-300">Nível {plan.level}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-blue-400">✓</span>
                    <span className="text-slate-300">Certificado mensal</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-blue-400">✓</span>
                    <span className="text-slate-300">Tutor de IA 24/7</span>
                  </div>
                </div>

                <Link
                  href="/cadastro"
                  className={`w-full py-3 rounded-lg font-semibold transition-all text-center ${
                    plan.badge
                      ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:shadow-lg hover:shadow-blue-500/50"
                      : "border border-slate-600 text-white hover:bg-slate-800/50"
                  }`}
                >
                  Começar Agora
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl p-12 text-center space-y-6">
          <h3 className="text-4xl font-bold text-white">Pronto para começar?</h3>
          <p className="text-xl text-blue-50">Escolha seu idioma, seu tutor e sua meta. O resto é com a gente.</p>
          <Link
            href="/cadastro"
            className="inline-block px-8 py-4 bg-white text-blue-600 font-bold rounded-lg hover:bg-blue-50 transition-colors"
          >
            Começar Gratuitamente → 7 dias grátis
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-700/50 py-12 px-6 text-center text-slate-400">
        <div className="max-w-7xl mx-auto">
          <p>© 2026 SouBilingue. Todos os direitos reservados.</p>
          <div className="flex justify-center gap-6 mt-4 text-sm">
            <a href="#" className="hover:text-white transition-colors">Privacidade</a>
            <a href="#" className="hover:text-white transition-colors">Termos</a>
            <a href="#" className="hover:text-white transition-colors">Contato</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
