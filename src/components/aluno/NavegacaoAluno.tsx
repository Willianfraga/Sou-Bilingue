import Link from "next/link";

const itens = [
  { href: "/aluno/licoes", numero: "01", label: "Licoes" },
  { href: "/aluno/aula", numero: "02", label: "Praticar" },
  { href: "/aluno", numero: "03", label: "Progresso" },
  { href: "/aluno/perfil", numero: "04", label: "Perfil" },
];

export function NavegacaoAluno() {
  return (
    <nav aria-label="Navegacao do aluno" className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-100 bg-white/95 px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-2 shadow-[0_-10px_30px_rgba(30,41,59,0.08)] backdrop-blur md:hidden">
      <ul className="mx-auto grid max-w-md grid-cols-4">
        {itens.map((item) => (
          <li key={item.href}>
            <Link href={item.href} className="flex flex-col items-center gap-1 rounded-2xl px-2 py-1.5 text-[11px] font-semibold text-slate-500 transition hover:bg-indigo-50 hover:text-indigo-600">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-50 text-[10px] font-bold leading-none text-indigo-600">{item.numero}</span>
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
