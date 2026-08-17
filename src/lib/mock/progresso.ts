import { DIAS_POR_PLANO, type ProgressoDoMes } from "@/lib/types";

// Dado fixo — não vem de banco ainda. Formato já pensado pra bater com a tabela
// real quando ela existir (ver docs/ESCOPO.md § 05: cota semanal não acumula,
// zera toda semana, certificado só no fechamento do mês).
export function getProgressoDoMesMock(): ProgressoDoMes {
  const plano = "intermediario" as const;
  const diasNecessarios = DIAS_POR_PLANO[plano];

  return {
    mesReferencia: "Agosto 2026",
    plano,
    semanas: [
      { numero: 1, diasCumpridos: diasNecessarios, diasNecessarios },
      { numero: 2, diasCumpridos: diasNecessarios, diasNecessarios },
      { numero: 3, diasCumpridos: 3, diasNecessarios }, // semana corrente, em andamento
      { numero: 4, diasCumpridos: 0, diasNecessarios }, // ainda não começou
    ],
  };
}
