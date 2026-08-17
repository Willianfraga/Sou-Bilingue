import Link from "next/link";

type NavItem = { href: string; label: string };

/**
 * Menu lateral compartilhado pelas três interfaces (aluno, responsável, criador).
 * Sem indicação de rota ativa nem autenticação ainda — só o esqueleto de
 * navegação. Ver docs/ESCOPO.md seção 03 para o que cada tela deve conter.
 */
export function SideNav({ title, items }: { title: string; items: NavItem[] }) {
  return (
    <nav className="w-60 shrink-0 border-r border-neutral-200 px-4 py-8">
      <div className="mb-6 font-mono text-xs uppercase tracking-widest text-amber-700">
        {title}
      </div>
      <ul className="flex flex-col gap-1">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="block rounded px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-100"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
