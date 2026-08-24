import Link from "next/link";
import { SairButton } from "@/components/SairButton";

type NavItem = { href: string; label: string };

// Menu lateral compartilhado pelas três interfaces (aluno, responsável, criador).
// Ver docs/ESCOPO.md seção 03 para o que cada tela deve conter.
export function SideNav({
  title,
  items,
  nome,
  tone = "default",
}: {
  title: string;
  items: NavItem[];
  nome: string;
  tone?: "default" | "purple";
}) {
  const roxo = tone === "purple";

  return (
    <nav className={`flex w-60 shrink-0 flex-col justify-between border-r px-5 py-8 ${roxo ? "border-violet-500 bg-gradient-to-b from-indigo-600 to-violet-600 text-white shadow-xl shadow-indigo-200/50" : "border-neutral-200"}`}>
      <div>
        <div className={`mb-6 font-mono text-xs uppercase tracking-[0.2em] ${roxo ? "text-white" : "text-amber-700"}`}>
          {title}
        </div>
        <ul className="flex flex-col gap-1">
          {items.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`block rounded-xl px-3 py-2 text-sm transition ${roxo ? "text-indigo-50 hover:bg-white/15 hover:text-white" : "text-neutral-700 hover:bg-neutral-100"}`}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div className={`border-t pt-4 ${roxo ? "border-white/20" : "border-neutral-100"}`}>
        <p className={`px-3 text-sm font-semibold ${roxo ? "text-white" : "text-neutral-700"}`}>{nome}</p>
        <SairButton inverted={roxo} />
      </div>
    </nav>
  );
}
