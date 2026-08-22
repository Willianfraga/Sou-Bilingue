"use client";

import { useState } from "react";
import { baixarCSV, gerarCSVSessoes, gerarCSVTopups, gerarCSVResumo } from "@/lib/export/csv-generator";
import { gerarPDFRelatorio } from "@/lib/export/pdf-generator";
import {
  getHistoricoSessoesAction,
} from "@/app/aluno/dashboard/actions";

interface ExportacaoProps {
  nomeAluno: string;
  periodo: string;
  consumoData: {
    horas_total: number;
    horas_usadas: number;
    horas_restantes: number;
    percentual_usado: number;
    sessoes_total: number;
    duracao_media: number;
  };
}

export function BotoesExportacao({
  nomeAluno,
  periodo,
  consumoData,
}: ExportacaoProps) {
  const [exportando, setExportando] = useState<string | null>(null);

  const handleExportarCSVSessoes = async () => {
    try {
      setExportando("csv-sessoes");
      const res = await getHistoricoSessoesAction(1000);

      if (res.success && res.sessoes) {
        const sessoes = res.sessoes.map((s: any) => ({
          data: new Date(s.iniciada_em).toLocaleDateString("pt-BR"),
          horario: new Date(s.iniciada_em).toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          duracao_minutos: s.duracao_minutos,
          tipo: s.tipo,
          horas: (s.segundos_utilizados || 0) / 3600,
        }));

        const csv = gerarCSVSessoes(sessoes);
        baixarCSV(csv, `sessoes-${new Date().toISOString().split("T")[0]}.csv`);
      }
    } catch (error) {
      console.error("Erro ao exportar CSV:", error);
    } finally {
      setExportando(null);
    }
  };

  const handleExportarPDF = () => {
    try {
      setExportando("pdf");
      gerarPDFRelatorio(nomeAluno, periodo, {
        horas_total: consumoData.horas_total,
        horas_usadas: consumoData.horas_usadas,
        horas_restantes: consumoData.horas_restantes,
        percentual_usado: consumoData.percentual_usado,
        sessoes_total: consumoData.sessoes_total,
        duracao_media: consumoData.duracao_media,
        data_geracao: new Date().toLocaleDateString("pt-BR"),
      });
    } catch (error) {
      console.error("Erro ao exportar PDF:", error);
    } finally {
      setExportando(null);
    }
  };

  return (
    <div className="bg-white border border-neutral-200 rounded-lg p-6">
      <div>
        <h3 className="text-lg font-semibold text-neutral-900 mb-4">Exportar Dados</h3>
        <p className="text-sm text-neutral-600 mb-6">
          Baixe seus dados de consumo em diferentes formatos
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* CSV Sessões */}
        <button
          onClick={handleExportarCSVSessoes}
          disabled={exportando !== null}
          className={`p-4 rounded-lg border-2 transition-all ${
            exportando === "csv-sessoes"
              ? "opacity-50 cursor-not-allowed"
              : "border-green-200 bg-green-50 hover:bg-green-100 text-green-900"
          }`}
        >
          <div className="text-2xl mb-2">📊</div>
          <div className="font-semibold text-sm">Sessões (CSV)</div>
          <div className="text-xs text-green-700 mt-1">
            {exportando === "csv-sessoes" ? "Gerando..." : "Todos os registros"}
          </div>
        </button>

        {/* PDF Relatório */}
        <button
          onClick={handleExportarPDF}
          disabled={exportando !== null}
          className={`p-4 rounded-lg border-2 transition-all ${
            exportando === "pdf"
              ? "opacity-50 cursor-not-allowed"
              : "border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-900"
          }`}
        >
          <div className="text-2xl mb-2">📄</div>
          <div className="font-semibold text-sm">Relatório (PDF)</div>
          <div className="text-xs text-blue-700 mt-1">
            {exportando === "pdf" ? "Gerando..." : "Resumo formatado"}
          </div>
        </button>

        {/* Dica */}
        <div className="p-4 rounded-lg bg-neutral-50 border-2 border-neutral-200">
          <div className="text-2xl mb-2">💡</div>
          <div className="font-semibold text-sm text-neutral-900">Dica</div>
          <div className="text-xs text-neutral-600 mt-1">
            Use CSV para análises em Excel. Use PDF para compartilhar e imprimir.
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-900">
          <strong>📧 Em breve:</strong> Email automático com relatório mensal
        </p>
      </div>
    </div>
  );
}
