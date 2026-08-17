import { SideNav } from "@/components/SideNav";

const items = [
  { href: "/aluno", label: "Progresso do mês" },
  { href: "/aluno/aula", label: "Aula" },
  { href: "/aluno/certificados", label: "Certificados" },
  { href: "/aluno/perfil", label: "Perfil" },
];

export default function AlunoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <SideNav title="Interface do aluno" items={items} />
      <div className="flex-1 px-10 py-10">{children}</div>
    </div>
  );
}
