import { SideNav } from "@/components/SideNav";
import { requirePapel } from "@/lib/auth/guards";

const items = [
  { href: "/aluno", label: "Progresso do mês" },
  { href: "/aluno/aula", label: "Aula" },
  { href: "/aluno/certificados", label: "Certificados" },
  { href: "/aluno/perfil", label: "Perfil" },
];

export default async function AlunoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sessao = await requirePapel("aluno");

  return (
    <div className="flex min-h-screen">
      <SideNav title="Interface do aluno" items={items} nome={sessao.nome} />
      <div className="flex-1 px-10 py-10">{children}</div>
    </div>
  );
}
