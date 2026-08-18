import Link from "next/link";
import { SairButton } from "@/components/SairButton";

type NavItem = { href: string; label: string };

// Menu lateral compartilhado pelas três interfaces (aluno, responsável, criador).
// Ver docs/ESCOPO.md seção 03 para o que cada tela deve conter.
export function SideNav({
  title,
  items,
  nome,
}: {
  title: string;
  items: NavItem[];
  nome: string;
}) {
  return (
    <nav className="flex w-60 shrink-0 flex-col justify-between border-r border-neutral-200 px-4 py-8">
      <div>
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
      </div>

      <div className="border-t border-neutral-100 pt-4">
        <p className="px-3 text-sm font-medium text-neutral-700">{nome}</p>
        <SairButton />
      </div>
    </nav>
  );
}
