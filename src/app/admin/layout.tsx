import { EstruturaAdmin } from "@/components/admin/EstruturaAdmin";
import { getSessaoAdmin } from "@/lib/admin/sessao";
import { AREAS_ADMIN, ROTULO_FUNCAO, podeAcessar } from "@/lib/admin/permissoes";

export const dynamic = "force-dynamic";

// Painel administrativo (docs/admin-painel.md). O layout só monta o menu com
// as áreas que a função permite; cada página e cada ação confere de novo com
// requireArea, e o banco confere com RLS/service role.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const sessao = await getSessaoAdmin();
  const areas = AREAS_ADMIN.filter((a) => podeAcessar(sessao.funcoes, a)).map((a) => a.id);
  const funcoes = sessao.funcoes.length ? sessao.funcoes.map((f) => ROTULO_FUNCAO[f]).join(", ") : "Sem função atribuída";

  return (
    <EstruturaAdmin areasPermitidas={areas} nome={sessao.nome} funcoes={funcoes}>
      {children}
    </EstruturaAdmin>
  );
}
