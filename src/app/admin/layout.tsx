import { SideNav } from "@/components/SideNav";
import { requirePapel } from "@/lib/auth/guards";

const items = [
  { href: "/admin", label: "Assinaturas" },
  { href: "/admin/conteudo", label: "Conteúdo (CMS)" },
  { href: "/admin/certificacao", label: "Motor de certificação" },
  { href: "/admin/cupons", label: "Cupons e QR Codes" },
  { href: "/admin/origem", label: "Origem dos cadastros" },
  { href: "/admin/auditoria", label: "Auditoria LGPD" },
  { href: "/admin/escolas", label: "Parcerias com escolas" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sessao = await requirePapel("admin");

  return (
    <div className="flex min-h-screen">
      <SideNav title="Interface do criador" items={items} nome={sessao.nome} />
      <div className="flex-1 px-10 py-10">{children}</div>
    </div>
  );
}
