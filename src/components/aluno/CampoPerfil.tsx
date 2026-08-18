export function CampoPerfil({
  label,
  valor,
  detalhe,
}: {
  label: string;
  valor: string;
  detalhe?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-neutral-100 py-4 last:border-b-0">
      <span className="font-mono text-xs uppercase tracking-widest text-neutral-400">
        {label}
      </span>
      <div className="text-right">
        <p className="font-semibold">{valor}</p>
        {detalhe && <p className="text-xs text-neutral-500">{detalhe}</p>}
      </div>
    </div>
  );
}
