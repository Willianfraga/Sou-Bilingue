import type { Metadata } from "next";
import Link from "next/link";
import { AssistenteVendas, BotaoAbrirAssistente } from "@/components/vendas/AssistenteVendas";
import { getConteudoVendas } from "@/lib/data/vendas";

export const metadata: Metadata = {
  title: "Contato — Sou Bilíngue",
  description: "Fale com o Sou Bilíngue: canais de atendimento e dados da empresa.",
};
export const dynamic = "force-dynamic";

// Contato. Canais e dados da empresa vêm do admin (/admin/pagina-de-vendas →
// Contato). Campo vazio mostra "em breve" — nunca um dado inventado.
// Nome, CNPJ/CPF e endereço são exigidos pelo Decreto 7.962/2013, art. 2º.
export default async function Contato() {
  const c = await getConteudoVendas();
  const whatsapp = c.suporteWhatsapp ? `https://wa.me/${c.suporteWhatsapp}` : "";
  const temCanal = Boolean(c.suporteEmail || whatsapp);
  const emBreve = <span className="text-slate-400">em breve</span>;

  return (
    <main className="min-h-screen bg-[#f6f4ff] px-5 py-12 text-slate-800 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm font-bold text-violet-700 hover:underline">← Sou Bilíngue</Link>
        <h1 className="mt-4 text-3xl font-black text-slate-900 sm:text-4xl">Fale com a gente</h1>
        <p className="mt-2 text-lg text-slate-600">Dúvidas sobre as aulas, os planos, o pagamento ou a sua conta.</p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <section className="rounded-3xl bg-gradient-to-br from-indigo-950 via-violet-900 to-fuchsia-900 p-6 text-white shadow-xl">
            <p aria-hidden className="text-3xl">💬</p>
            <h2 className="mt-2 text-xl font-black">Resposta na hora</h2>
            <p className="mt-2 text-sm text-violet-100">
              O assistente virtual responde dúvidas sobre o app a qualquer hora. É uma inteligência artificial treinada com as
              informações oficiais do Sou Bilíngue.
            </p>
            {c.assistenteAtivo ? (
              <BotaoAbrirAssistente className="vendas-cta mt-5 w-full">Tirar uma dúvida agora</BotaoAbrirAssistente>
            ) : (
              <p className="mt-5 text-sm text-violet-200">Assistente indisponível no momento.</p>
            )}
          </section>

          <section className="rounded-3xl bg-white p-6 shadow-xl ring-1 ring-violet-100">
            <p aria-hidden className="text-3xl">🙋</p>
            <h2 className="mt-2 text-xl font-black text-slate-900">Atendimento</h2>
            {temCanal ? (
              <ul className="mt-3 space-y-3 text-sm">
                {c.suporteEmail && (
                  <li>
                    <span className="block text-slate-500">E-mail</span>
                    <a href={`mailto:${c.suporteEmail}`} className="font-bold text-violet-700 hover:underline">{c.suporteEmail}</a>
                  </li>
                )}
                {whatsapp && (
                  <li>
                    <span className="block text-slate-500">WhatsApp</span>
                    <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="font-bold text-violet-700 hover:underline">
                      Conversar pelo WhatsApp
                    </a>
                  </li>
                )}
                {c.horarioAtendimento && (
                  <li>
                    <span className="block text-slate-500">Horário</span>
                    {c.horarioAtendimento}
                  </li>
                )}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-slate-600">
                Nossos canais de atendimento (e-mail e WhatsApp) serão publicados aqui em breve. Enquanto isso, o assistente virtual
                responde as dúvidas sobre o app.
              </p>
            )}
          </section>
        </div>

        <section className="mt-4 rounded-3xl bg-white p-6 shadow-xl ring-1 ring-violet-100">
          <h2 className="text-xl font-black text-slate-900">Já é aluno?</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            <li>
              • <strong>Cancelar a renovação ou pedir reembolso:</strong> no app, em <Link href="/assinatura" className="font-bold text-violet-700 hover:underline">Minha assinatura</Link>. Não é
              preciso falar com ninguém.
            </li>
            <li>
              • <strong>Regras de cancelamento e reembolso:</strong>{" "}
              <Link href="/reembolso" className="font-bold text-violet-700 hover:underline">Política de reembolso</Link>
            </li>
            <li>
              • <strong>Perguntas frequentes:</strong>{" "}
              <Link href="/#perguntas" className="font-bold text-violet-700 hover:underline">na página inicial</Link>
            </li>
          </ul>
        </section>

        <section className="mt-4 rounded-3xl bg-white p-6 text-sm shadow-xl ring-1 ring-violet-100">
          <h2 className="text-xl font-black text-slate-900">Dados da empresa</h2>
          <dl className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-[auto_1fr]">
            <dt className="text-slate-500">Nome empresarial</dt>
            <dd>{c.empresaNome || emBreve}</dd>
            <dt className="text-slate-500">CNPJ</dt>
            <dd>{c.empresaCnpj || emBreve}</dd>
            <dt className="text-slate-500">Endereço</dt>
            <dd>{c.empresaEndereco || emBreve}</dd>
            <dt className="text-slate-500">E-mail</dt>
            <dd>{c.suporteEmail || emBreve}</dd>
          </dl>
          <p className="mt-4 text-xs text-slate-500">
            <Link href="/termos" className="underline">Termos de uso</Link> ·{" "}
            <Link href="/privacidade" className="underline">Privacidade</Link> ·{" "}
            <Link href="/reembolso" className="underline">Cancelamento e reembolso</Link>
          </p>
        </section>
      </div>
      {c.assistenteAtivo && <AssistenteVendas pagina="contato" />}
    </main>
  );
}
