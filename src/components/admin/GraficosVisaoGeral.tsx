"use client";

import { BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, LineElement, PointElement, Tooltip } from "chart.js";
import { useState } from "react";
import { Bar, Line } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend);

// Paleta validada (skill dataviz, slots 1 e 2): receita e custo nunca trocam
// de cor. Um eixo por gráfico — alunos ativos ficam em gráfico separado.
const COR_RECEITA = "#2a78d6";
const COR_CUSTO = "#eb6834";
const TINTA = "#52514e";
const GRADE = "#e7e5e4";

export type PontoGrafico = { dia: string; receita: number; custoBrl: number | null; ativos: number };

const reais = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const rotuloDia = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;

const eixos = (formatar: (v: number) => string, inteiro = false) => ({
  x: { grid: { display: false }, ticks: { color: TINTA, maxRotation: 0, autoSkipPadding: 12 } },
  y: { beginAtZero: true, grid: { color: GRADE }, border: { display: false }, ticks: { color: TINTA, ...(inteiro ? { precision: 0, stepSize: 1 } : {}), callback: (v: string | number) => formatar(Number(v)) } },
});

export function GraficosVisaoGeral({ pontos, temCambio }: { pontos: PontoGrafico[]; temCambio: boolean }) {
  const [tabela, setTabela] = useState(false);
  const rotulos = pontos.map((p) => rotuloDia(p.dia));
  const vazio = pontos.every((p) => !p.receita && !p.custoBrl && !p.ativos);

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-black text-slate-900">Tendência diária</h2>
          <p className="text-sm text-slate-500">Receita confirmada × custo estimado de IA, e alunos ativos por dia (horário de Brasília).</p>
        </div>
        <button
          type="button"
          onClick={() => setTabela((t) => !t)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
        >
          {tabela ? "Ver gráficos" : "Ver como tabela"}
        </button>
      </div>

      {vazio && !tabela ? (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          Sem receita, custo ou atividade neste período.
        </p>
      ) : tabela ? (
        <div className="max-h-96 overflow-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2">Dia</th>
                <th className="px-3 py-2 text-right">Receita</th>
                <th className="px-3 py-2 text-right">Custo de IA (estimado)</th>
                <th className="px-3 py-2 text-right">Alunos ativos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 tabular-nums">
              {pontos.map((p) => (
                <tr key={p.dia}>
                  <td className="px-3 py-1.5">{rotuloDia(p.dia)}</td>
                  <td className="px-3 py-1.5 text-right">{reais.format(p.receita)}</td>
                  <td className="px-3 py-1.5 text-right">{p.custoBrl === null ? "—" : reais.format(p.custoBrl)}</td>
                  <td className="px-3 py-1.5 text-right">{p.ativos}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <figure className="rounded-2xl border border-slate-200 bg-white p-4 lg:col-span-2">
            <figcaption className="mb-2 text-sm font-semibold text-slate-700">Receita × custo de IA (R$)</figcaption>
            <div className="h-64">
              <Line
                data={{
                  labels: rotulos,
                  datasets: [
                    { label: "Receita (confirmada)", data: pontos.map((p) => p.receita), borderColor: COR_RECEITA, backgroundColor: COR_RECEITA, borderWidth: 2, pointRadius: 0, pointHoverRadius: 5, tension: 0.25 },
                    ...(temCambio
                      ? [{ label: "Custo de IA (estimado)", data: pontos.map((p) => p.custoBrl ?? 0), borderColor: COR_CUSTO, backgroundColor: COR_CUSTO, borderWidth: 2, pointRadius: 0, pointHoverRadius: 5, tension: 0.25 }]
                      : []),
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  interaction: { mode: "index", intersect: false },
                  plugins: {
                    legend: { position: "bottom", labels: { usePointStyle: true, boxWidth: 8, color: TINTA } },
                    tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${reais.format(Number(c.parsed.y))}` } },
                  },
                  scales: eixos((v) => reais.format(v)),
                }}
              />
            </div>
            {!temCambio && <p className="mt-2 text-xs text-amber-800">Câmbio indisponível: o custo de IA aparece só em dólar nos cartões.</p>}
          </figure>
          <figure className="rounded-2xl border border-slate-200 bg-white p-4">
            <figcaption className="mb-2 text-sm font-semibold text-slate-700">Alunos ativos por dia</figcaption>
            <div className="h-64">
              <Bar
                data={{ labels: rotulos, datasets: [{ label: "Alunos ativos", data: pontos.map((p) => p.ativos), backgroundColor: COR_RECEITA, borderRadius: 4, maxBarThickness: 18 }] }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => `${c.parsed.y} aluno(s) ativo(s)` } } },
                  scales: eixos((v) => String(v), true),
                }}
              />
            </div>
          </figure>
        </div>
      )}
    </section>
  );
}
