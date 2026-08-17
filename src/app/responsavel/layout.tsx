import { SideNav } from "@/components/SideNav";

const items = [
  { href: "/responsavel", label: "Progresso do aluno" },
  { href: "/responsavel/certificados", label: "Certificados" },
  { href: "/responsavel/consentimento", label: "Consentimento LGPD" },
  { href: "/responsavel/configuracoes", label: "Limites de uso" },
  { href: "/responsavel/suporte", label: "Suporte" },
];

export default function ResponsavelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <SideNav title="Interface do responsável" items={items} />
      <div className="flex-1 px-10 py-10">{children}</div>
    </div>
  );
}
