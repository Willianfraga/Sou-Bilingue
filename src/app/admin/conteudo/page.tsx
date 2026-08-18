import { StatusChip } from "@/components/admin/StatusChip";
import { getConteudoMock } from "@/lib/mock/admin";
import { NOME_DO_IDIOMA } from "@/lib/types";

export default function Conteudo() {
  const conteudo = getConteudoMock();

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <span className="font-mono text-xs uppercase tracking-widest text-neutral-400">
          CMS
        </span>
        <h1 className="mt-1 text-2xl font-bold">Conteúdo</h1>
      </div>

      <div className="rounded-lg border border-neutral-200 px-5">
        {conteudo.map((item, i) => (
          <div
            key={i}
            className="flex items-center justify-between border-b border-neutral-100 py-4 last:border-b-0"
          >
            <span className="font-semibold">
              {NOME_DO_IDIOMA[item.idioma]} · {item.nivel}
            </span>
            <StatusChip status={item.status} />
          </div>
        ))}
      </div>

      <p className="text-sm text-neutral-500">
        Curadoria por idioma/nível é tarefa única, não uma etapa manual por
        aluno — só o Espanhol está no ar por enquanto (§ 08: 1 idioma na Fase
        1).
      </p>
    </div>
  );
}
