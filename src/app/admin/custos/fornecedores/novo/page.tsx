import Link from "next/link";
import { FormFornecedor } from "@/components/admin/FormFornecedor";
import { requireArea } from "@/lib/admin/sessao";

export const dynamic = "force-dynamic";

export default async function NovoFornecedor({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  await requireArea("ferramentas");
  const { erro } = await searchParams;
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <Link href="/admin/custos" className="text-sm font-semibold text-violet-700 hover:underline">← Custos e ferramentas</Link>
      <h1 className="text-2xl font-black text-slate-950">Nova ferramenta ou fornecedor</h1>
      {erro && <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">{erro}</p>}
      <FormFornecedor fornecedor={null} />
    </div>
  );
}
