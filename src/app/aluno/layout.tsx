import { SideNav } from "@/components/SideNav";
import { requirePapel } from "@/lib/auth/guards";

const items = [
  { href: "/aluno/aula", label: "Iniciar aula" },
  { href: "/aluno/aula#escolher-tutor", label: "Escolher meu tutor" },
  { href: "/aluno", label: "Meu progresso" },
  { href: "/aluno/perfil", label: "Meu perfil" },
  { href: "/aluno/licoes#escolher-idioma", label: "Escolher meu idioma" },
  { href: "/aluno/certificados", label: "Meus certificados" },
  { href: "/aluno/licoes", label: "Minhas lições" },
];

export default async function AlunoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sessao = await requirePapel("aluno");

  return (
    <div className="min-h-screen bg-[#f8f9ff]">
      <div className="hidden min-h-screen md:flex">
        <SideNav title="Sou Bilíngue" items={items} nome={sessao.nome} tone="purple" />
        <div className="flex-1 px-10 py-10">{children}</div>
      </div>

      <div className="mx-auto min-h-screen max-w-md px-5 pb-8 pt-7 md:hidden">
        <header className="mb-7 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-400">Sou Bilíngue</p>
            <p className="text-xl font-bold tracking-tight text-slate-900">Olá, {sessao.nome}!</p>
          </div>
          <a
            href="/aluno/perfil"
            aria-label="Abrir perfil"
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-lg font-bold text-white shadow-lg shadow-indigo-200"
          >
            {sessao.nome.slice(0, 1).toUpperCase()}
          </a>
        </header>
        {children}
      </div>

    </div>
  );
}
