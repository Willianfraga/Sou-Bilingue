import { SideNav } from "@/components/SideNav";
import { requirePapel } from "@/lib/auth/guards";

const items = [
  { href: "/responsavel", label: "Progresso do aluno" },
  { href: "/responsavel/certificados", label: "Certificados" },
  { href: "/responsavel/consentimento", label: "Consentimento LGPD" },
  { href: "/responsavel/configuracoes", label: "Limites de uso" },
  { href: "/responsavel/suporte", label: "Suporte" },
];

export default async function ResponsavelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sessao = await requirePapel("responsavel");

  return (
    <div className="flex min-h-screen">
      <SideNav
        title="Interface do responsável"
        items={items}
        nome={sessao.nome}
      />
      <div className="flex-1 px-10 py-10">{children}</div>
    </div>
  );
}
