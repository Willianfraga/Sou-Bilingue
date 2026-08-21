import { semanaCompleta, type StatusSemana } from "@/lib/types";

function StatusDaSemana({ semana }: { semana: StatusSemana }) {
  const completa = semanaCompleta(semana);
  const emAndamento = !completa && semana.diasCumpridos > 0;

  return (
    <div className="flex flex-1 flex-col items-center gap-2 rounded-lg border border-neutral-200 px-3 py-4">
      <span className="font-mono text-[11px] uppercase tracking-widest text-neutral-400">
        Semana {semana.numero}
      </span>
      <span
        className={
          "flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold " +
          (completa
            ? "bg-teal-600 text-white"
            : emAndamento
              ? "bg-amber-100 text-amber-700"
              : "bg-neutral-100 text-neutral-400")
        }
      >
        {completa ? "✓" : `${semana.diasCumpridos}/${semana.diasNecessarios}`}
      </span>
      <span className="text-xs text-neutral-500">
        {completa ? "completa" : emAndamento ? "em andamento" : "não começou"}
      </span>
    </div>
  );
}

// § 05: toda semana a cota zera e volta a valer do zero — o mapa mostra as 4
// semanas do mês, não um streak contínuo.
export function MapaDoMes({ semanas }: { semanas: StatusSemana[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {semanas.map((semana) => (
        <StatusDaSemana key={semana.numero} semana={semana} />
      ))}
    </div>
  );
}
