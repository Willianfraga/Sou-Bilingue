import { ConsumoDashboard } from "@/components/aluno/ConsumoDashboard";
import { HistoricoSessoes } from "@/components/aluno/HistoricoSessoes";
import { ConsumoCharts } from "@/components/aluno/ConsumoCharts";
import { DashboardComFiltros } from "@/components/aluno/DashboardComFiltros";

export default function DashboardPage() {
  return (
    <div className="space-y-12">
      {/* Dashboard Principal */}
      <section>
        <ConsumoDashboard />
      </section>

      {/* Dashboard com Filtros e Comparativos */}
      <section>
        <DashboardComFiltros />
      </section>

      {/* Gráficos Interativos */}
      <section>
        <ConsumoCharts />
      </section>

      {/* Histórico de Sessões */}
      <section>
        <HistoricoSessoes />
      </section>
    </div>
  );
}
