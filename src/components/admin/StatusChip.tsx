const CORES: Record<string, string> = {
  ativa: "bg-teal-50 text-teal-700",
  publicado: "bg-teal-50 text-teal-700",
  fechada: "bg-teal-50 text-teal-700",
  atrasada: "bg-amber-50 text-amber-700",
  negociando: "bg-amber-50 text-amber-700",
  "em curadoria": "bg-amber-50 text-amber-700",
  cancelada: "bg-neutral-100 text-neutral-500",
  contatada: "bg-neutral-100 text-neutral-500",
};

export function StatusChip({ status }: { status: string }) {
  return (
    <span
      className={
        "rounded-full px-2.5 py-0.5 text-xs font-medium " +
        (CORES[status] ?? "bg-neutral-100 text-neutral-600")
      }
    >
      {status}
    </span>
  );
}
