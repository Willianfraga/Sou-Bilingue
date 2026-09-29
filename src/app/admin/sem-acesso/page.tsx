import Link from "next/link";
import { areaPorId } from "@/lib/admin/permissoes";
import { getSessaoAdmin } from "@/lib/admin/sessao";

// Destino de quem tenta abrir uma área sem a função necessária (a tentativa
// fica na auditoria como "acesso.negado").
export default async function SemAcesso({ searchParams }: { searchParams: Promise<{ area?: string }> }) {
  const sessao = await getSessaoAdmin();
  const { area } = await searchParams;
  const nome = area ? areaPorId(area)?.rotulo : null;
  return (
    <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-6">
      <h1 className="text-xl font-black text-slate-900">Sem acesso{nome ? ` a ${nome}` : ""}</h1>
      <p className="mt-2 text-sm text-slate-600">
        {sessao.funcoes.length
          ? "Sua função no painel não inclui esta área. Se precisar, peça a um administrador geral."
          : "Sua conta ainda não tem função no painel. Peça a um administrador geral para atribuir uma."}
      </p>
      {sessao.funcoes.length > 0 && (
        <Link href="/admin" className="mt-4 inline-block text-sm font-bold text-violet-700 hover:underline">
          Voltar ao painel
        </Link>
      )}
    </div>
  );
}
