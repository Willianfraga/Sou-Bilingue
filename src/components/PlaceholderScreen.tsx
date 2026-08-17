/**
 * Tela vazia padrão do esqueleto de navegação — conteúdo real entra depois,
 * uma interface de cada vez. `escopo` aponta pra seção de docs/ESCOPO.md que
 * descreve o que essa tela precisa fazer.
 */
export function PlaceholderScreen({
  title,
  escopo,
  descricao,
}: {
  title: string;
  escopo: string;
  descricao: string;
}) {
  return (
    <div className="flex max-w-xl flex-col gap-3">
      <span className="font-mono text-xs uppercase tracking-widest text-neutral-400">
        {escopo} · ainda não implementado
      </span>
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="text-neutral-600">{descricao}</p>
    </div>
  );
}
