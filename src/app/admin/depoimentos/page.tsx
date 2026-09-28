import { getDepoimentosParaModeracao } from "@/lib/data/depoimentos";
import { moderar } from "./actions";

export const dynamic = "force-dynamic";

const ROTULO: Record<string, string> = {
  pendente: "Aguardando revisão",
  aprovado: "Publicado",
  recusado: "Recusado",
  retirado: "Autorização retirada pelo aluno",
};

// Depoimentos enviados pelos alunos (com autorização). Só os aprovados
// aparecem na página de vendas. Autorização retirada não pode ser revertida.
export default async function DepoimentosAdmin() {
  const lista = await getDepoimentosParaModeracao();

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <span className="font-mono text-xs uppercase tracking-widest text-neutral-400">Página de vendas</span>
        <h1 className="mt-1 text-2xl font-bold">Depoimentos dos alunos</h1>
        <p className="mt-2 text-sm text-neutral-500">
          Enviados pelos próprios alunos, que autorizaram a publicação. Aprove só o que for verdadeiro e respeitoso.
        </p>
      </div>

      {lista.length === 0 ? (
        <p className="rounded-lg border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500">
          Nenhum depoimento ainda. Os alunos enviam pelo perfil, em &quot;Conte como está sendo&quot;.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {lista.map((d) => (
            <li key={d.id} className="rounded-lg border border-neutral-200 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold">
                  {d.nome_exibicao}
                  {d.contexto && <span className="font-normal text-neutral-500"> · {d.contexto}</span>}
                </p>
                <span className="text-xs text-neutral-500">{ROTULO[d.status] ?? d.status}</span>
              </div>
              <blockquote className="mt-2 text-sm text-neutral-700">&ldquo;{d.texto}&rdquo;</blockquote>
              {d.status !== "retirado" && (
                <form action={moderar} className="mt-3 flex gap-2">
                  <input type="hidden" name="id" value={d.id} />
                  {d.status !== "aprovado" && (
                    <button name="decisao" value="aprovado" className="rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800">
                      Publicar
                    </button>
                  )}
                  {d.status !== "recusado" && (
                    <button name="decisao" value="recusado" className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-semibold hover:bg-neutral-50">
                      {d.status === "aprovado" ? "Tirar da página" : "Não publicar"}
                    </button>
                  )}
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
