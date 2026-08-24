"use client";

import { useEffect, useMemo, useState } from "react";
import { ArcElement, CategoryScale, Chart as ChartJS, Filler, Legend, LinearScale, LineElement, PointElement, Tooltip } from "chart.js";
import { Doughnut, Line } from "react-chartjs-2";
import { getAIUsageDashboardAction, getPlatformStatsAction, getTopupsStatsAction } from "@/app/admin/dashboard/actions";
import type { AIUsageDashboard } from "@/lib/ai/usage";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Filler, Tooltip, Legend);

interface PlatformStats { total_alunos: number; alunos_ativos: number; total_horas_consumidas: number; total_receita: number; subscricoes_ativas: number; planos_mais_populares: Array<{ nome: string; quantidade: number }>; }
interface TopupsStats { total_vendas: number; total_horas_vendidas: number; total_receita: number; pacote_mais_popular: string; receita_por_pacote: Array<{ pacote: string; horas: number; vendas: number; receita: number }>; }

const labels = { llm: "Claude · Conversação", tts: "ElevenLabs · Voz", stt: "ElevenLabs · Transcrição" };
const usdBrlEstimate = 5.5;
const money = (value: number, currency: "BRL" | "USD" = "BRL") => new Intl.NumberFormat("pt-BR", { style: "currency", currency, minimumFractionDigits: currency === "USD" ? 4 : 2 }).format(value);
const compact = (value: number) => new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(value);

export function AdminDashboard() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [topups, setTopups] = useState<TopupsStats | null>(null);
  const [ai, setAi] = useState<AIUsageDashboard | null>(null);
  const [period, setPeriod] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([getPlatformStatsAction(), getTopupsStatsAction(), getAIUsageDashboardAction(period)])
      .then(([platform, topup, usage]) => {
        if (!active) return;
        if (platform.success && platform.data) setStats(platform.data);
        if (topup.success && topup.data) setTopups(topup.data);
        if (usage.success && usage.data) { setAi(usage.data); setError(""); }
        else setError(usage.error ?? "Não foi possível carregar o consumo de IA.");
      }).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [period]);

  const lineData = useMemo(() => ({
    labels: ai?.daily.map((d) => new Date(`${d.date}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })) ?? [],
    datasets: [{ label: "Custo estimado (US$)", data: ai?.daily.map((d) => d.costUsd) ?? [], borderColor: "#7c3aed", backgroundColor: "rgba(124,58,237,.13)", fill: true, tension: .4, pointRadius: 2 }],
  }), [ai]);
  const doughnutData = useMemo(() => ({
    labels: ai?.byService.map((x) => labels[x.service]) ?? [],
    datasets: [{ data: ai?.byService.map((x) => x.costUsd) ?? [], backgroundColor: ["#7c3aed", "#06b6d4", "#f59e0b"], borderWidth: 0 }],
  }), [ai]);
  const totalTokens = (ai?.totals.inputTokens ?? 0) + (ai?.totals.outputTokens ?? 0) + (ai?.totals.cacheTokens ?? 0);
  const hasUsage = (ai?.totals.calls ?? 0) > 0;

  return <div className="space-y-7">
    <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-700 p-6 text-white shadow-2xl sm:p-9">
      <div className="absolute -right-20 -top-28 h-72 w-72 rounded-full bg-fuchsia-500/25 blur-3xl" />
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div><p className="text-xs font-bold uppercase tracking-[.28em] text-violet-200">Saúde do Sou Bilíngue</p><h1 className="mt-3 text-3xl font-black sm:text-4xl">Visão executiva da plataforma</h1><p className="mt-3 max-w-2xl text-sm text-indigo-100">Receita, alunos e custo operacional da inteligência artificial em um só lugar.</p></div>
        <div className="flex rounded-2xl bg-white/10 p-1 backdrop-blur">{[7,30,90].map((d) => <button key={d} onClick={() => setPeriod(d)} className={`rounded-xl px-4 py-2 text-sm font-bold transition ${period === d ? "bg-white text-violet-700 shadow" : "text-white hover:bg-white/10"}`}>{d} dias</button>)}</div>
      </div>
    </section>

    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Metric eyebrow="Alunos" value={compact(stats?.total_alunos ?? 0)} detail={`${stats?.alunos_ativos ?? 0} ativos`} tone="violet" icon="◎" />
      <Metric eyebrow="Receita registrada" value={money(stats?.total_receita ?? 0)} detail={`${stats?.subscricoes_ativas ?? 0} assinaturas ativas`} tone="emerald" icon="↗" />
      <Metric eyebrow="Consumo de IA" value={money(ai?.totals.costUsd ?? 0, "USD")} detail={`≈ ${money((ai?.totals.costUsd ?? 0) * usdBrlEstimate)} no período`} tone="cyan" icon="✦" />
      <Metric eyebrow="Chamadas de IA" value={compact(ai?.totals.calls ?? 0)} detail={`${compact(totalTokens)} tokens contabilizados`} tone="amber" icon="⌁" />
    </section>

    {error && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">{error} A migration de métricas precisa estar aplicada.</div>}
    <section className="grid gap-5 xl:grid-cols-[1.65fr_1fr]">
      <Panel title="Evolução do custo" subtitle={`Estimativa diária nos últimos ${period} dias`}>{loading ? <Skeleton /> : hasUsage ? <div className="h-72"><Line data={lineData} options={{ responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{x:{grid:{display:false}},y:{beginAtZero:true}} }} /></div> : <Empty />}</Panel>
      <Panel title="Custo por serviço" subtitle="Participação de cada fornecedor">{hasUsage ? <div className="mx-auto h-64 max-w-xs"><Doughnut data={doughnutData} options={{responsive:true,maintainAspectRatio:false,cutout:"70%",plugins:{legend:{position:"bottom",labels:{boxWidth:10,usePointStyle:true}}}}} /></div> : <Empty />}</Panel>
    </section>

    <section className="grid gap-5 lg:grid-cols-3">
      <Panel title="Claude Haiku" subtitle="Conversação e raciocínio"><Row label="Tokens de entrada" value={compact(ai?.totals.inputTokens ?? 0)} /><Row label="Tokens de saída" value={compact(ai?.totals.outputTokens ?? 0)} /><Row label="Cache de prompt" value={compact(ai?.totals.cacheTokens ?? 0)} /></Panel>
      <Panel title="ElevenLabs" subtitle="Voz premium e transcrição"><Row label="Texto sintetizado" value={`${compact(ai?.totals.characters ?? 0)} caracteres`} /><Row label="Áudio transcrito" value={`${(ai?.totals.audioMinutes ?? 0).toFixed(1)} min`} /><Row label="Chamadas de voz" value={String(ai?.byService.find((x) => x.service === "tts")?.calls ?? 0)} /></Panel>
      <Panel title="Operação educacional" subtitle="Uso e monetização"><Row label="Horas de aula" value={`${(stats?.total_horas_consumidas ?? 0).toFixed(1)} h`} /><Row label="Recargas vendidas" value={String(topups?.total_vendas ?? 0)} /><Row label="Receita de recargas" value={money(topups?.total_receita ?? 0)} /></Panel>
    </section>
    <section className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600"><strong className="text-slate-900">Como o custo é calculado:</strong> Claude por tokens; ElevenLabs Flash por caracteres; Scribe v2 por segundos de áudio. Os valores são estimativas conservadoras e a fatura dos provedores é a fonte definitiva. Conversas anteriores à ativação desta medição não aparecem retroativamente.</section>
  </div>;
}

function Metric({eyebrow,value,detail,tone,icon}:{eyebrow:string;value:string;detail:string;tone:"violet"|"emerald"|"cyan"|"amber";icon:string}) { const colors={violet:"from-violet-50 to-white text-violet-700 ring-violet-100",emerald:"from-emerald-50 to-white text-emerald-700 ring-emerald-100",cyan:"from-cyan-50 to-white text-cyan-700 ring-cyan-100",amber:"from-amber-50 to-white text-amber-700 ring-amber-100"}; return <article className={`rounded-3xl bg-gradient-to-br p-5 shadow-sm ring-1 ${colors[tone]}`}><div className="flex items-center justify-between"><p className="text-xs font-black uppercase tracking-[.16em] opacity-75">{eyebrow}</p><span className="text-xl">{icon}</span></div><p className="mt-4 text-3xl font-black tracking-tight text-slate-950">{value}</p><p className="mt-2 text-xs font-semibold opacity-80">{detail}</p></article>; }
function Panel({title,subtitle,children}:{title:string;subtitle:string;children:React.ReactNode}) { return <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><h2 className="text-lg font-black text-slate-950">{title}</h2><p className="mb-5 mt-1 text-sm text-slate-500">{subtitle}</p>{children}</article>; }
function Row({label,value}:{label:string;value:string}) { return <div className="flex items-center justify-between border-b border-slate-100 py-3 last:border-0"><span className="text-sm text-slate-600">{label}</span><strong className="text-sm text-slate-950">{value}</strong></div>; }
function Skeleton() { return <div className="h-72 animate-pulse rounded-2xl bg-slate-100" />; }
function Empty() { return <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-center"><span className="text-3xl">✦</span><p className="mt-3 font-bold text-slate-800">Aguardando o primeiro uso</p><p className="mt-1 max-w-xs text-xs text-slate-500">Os gráficos serão preenchidos quando os alunos conversarem com os tutores.</p></div>; }
