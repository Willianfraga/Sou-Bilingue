import Link from "next/link";

// Moldura das páginas legais (termos, privacidade).
export function PaginaLegal({ titulo, atualizado, children }: { titulo: string; atualizado: string; children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#f6f4ff] px-5 py-12 text-slate-800 sm:px-8">
      <article className="mx-auto max-w-3xl rounded-3xl bg-white p-6 shadow-xl ring-1 ring-violet-100 sm:p-10">
        <Link href="/" className="text-sm font-bold text-violet-700 hover:underline">← Sou Bilíngue</Link>
        <h1 className="mt-4 text-3xl font-black text-slate-900">{titulo}</h1>
        <p className="mt-2 text-sm text-slate-500">Atualizado em {atualizado}</p>
        <p className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
          Versão preliminar, descreve o funcionamento real do serviço e está em revisão jurídica.
        </p>
        <div className="mt-8 space-y-6 leading-relaxed [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-black [&_h2]:text-slate-900 [&_li]:ml-5 [&_li]:list-disc">
          {children}
        </div>
      </article>
    </main>
  );
}
