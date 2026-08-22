"use server";

import { requireSessao } from "@/lib/auth/guards";
import {
  getConsumoComPeriodo,
  getComparativoMeses,
  getTendenciasComPeriodo,
  getTaxaCrescimento,
  type Periodicidade,
} from "@/lib/billing/reports-advanced";

interface ActionState<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function getConsumoComPeriodoAction(
  periodo: Periodicidade
): Promise<ActionState<any>> {
  try {
    const sessao = await requireSessao();
    const user = sessao as any;
    const consumo = await getConsumoComPeriodo(user.id, periodo);

    if (!consumo) {
      return {
        success: false,
        error: "Nenhum dado de consumo encontrado",
      };
    }

    return {
      success: true,
      data: consumo,
    };
  } catch (error) {
    console.error("Erro ao buscar consumo com período:", error);
    return {
      success: false,
      error: "Erro ao buscar dados de consumo",
    };
  }
}

export async function getComparativoMesesAction(): Promise<ActionState<any>> {
  try {
    const sessao = await requireSessao();
    const user = sessao as any;
    const comparativo = await getComparativoMeses(user.id);

    return {
      success: true,
      data: comparativo,
    };
  } catch (error) {
    console.error("Erro ao buscar comparativo de meses:", error);
    return {
      success: false,
      error: "Erro ao buscar comparativo de meses",
    };
  }
}

export async function getTendenciasComPeriodoAction(
  periodo: Periodicidade
): Promise<ActionState<any>> {
  try {
    const sessao = await requireSessao();
    const user = sessao as any;
    const tendencias = await getTendenciasComPeriodo(user.id, periodo);

    return {
      success: true,
      data: tendencias,
    };
  } catch (error) {
    console.error("Erro ao buscar tendências com período:", error);
    return {
      success: false,
      error: "Erro ao buscar tendências",
    };
  }
}

export async function getTaxaCrescimentoAction(
  periodo: Periodicidade
): Promise<ActionState<any>> {
  try {
    const sessao = await requireSessao();
    const user = sessao as any;
    const taxa = await getTaxaCrescimento(user.id, periodo);

    return {
      success: true,
      data: taxa,
    };
  } catch (error) {
    console.error("Erro ao calcular taxa de crescimento:", error);
    return {
      success: false,
      error: "Erro ao calcular taxa de crescimento",
    };
  }
}
