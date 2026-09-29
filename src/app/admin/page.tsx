import { SecaoIndicadores } from "@/components/admin/CartaoIndicador";
import { FiltrosPainel } from "@/components/admin/FiltrosPainel";
import { GraficosVisaoGeral } from "@/components/admin/GraficosVisaoGeral";
import { formatarData } from "@/lib/admin/formatar";
import { usdParaCentavos } from "@/lib/admin/indicadores";
import { podeAcessar } from "@/lib/admin/permissoes";
import { requireArea } from "@/lib/admin/sessao";
import { getVisaoGeral } from "@/lib/admin/visao-geral";

export const dynamic = "force-dynamic";

// Visão geral: indicadores reais do período com comparação ao período
// anterior. Seções de dinheiro e custo só para quem tem função financeira
// ou de análise. Sem números fictícios: sem dado, o cartão mostra "—".
export default async function VisaoGeral({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sessao = await requireArea("visao-geral");
  const filtros = await searchParams;
  const v = await getVisaoGeral(filtros);
  const veDinheiro = podeAcessar(sessao.funcoes, "custos") || podeAcessar(sessao.funcoes, "financeiro");

  const pontos = v.serie.map((p) => ({
    dia: p.dia,
    receita: p.receita,
    custoBrl: v.cambio ? usdParaCentavos(p.custo_usd, v.cambio.taxa) / 100 : null,
    ativos: p.ativos,
  }));

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-violet-700">Visão geral · {v.periodo.rotulo}</p>
          <h1 className="mt-1 text-2xl font-black text-slate-950 sm:text-3xl">Como está o Sou Bilíngue</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Dados reais do banco. Cada número mostra se é <strong>confirmado</strong>, <strong>estimado</strong>,{" "}
            <strong>parcial</strong> ou <strong>calculado</strong>, e a comparação com o período anterior de mesmo tamanho.
          </p>
        </div>
        {veDinheiro && (
          <p className="text-xs text-slate-500">
            {v.cambio
              ? `Câmbio: US$ 1 = R$ ${v.cambio.taxa.toFixed(4).replace(".", ",")} (${v.cambio.fonte}, ${formatarData(v.cambio.data)}${v.cambio.reserva ? ", última cotação salva" : ""})`
              : "Câmbio indisponível: custos só em dólar."}
          </p>
        )}
      </div>

      <FiltrosPainel
        periodo={v.periodo.periodo}
        de={filtros.de}
        ate={filtros.ate}
        idioma={v.filtros.idioma}
        plano={v.filtros.plano}
        tutor={v.filtros.tutor}
        opcoes={v.opcoes}
      />

      {veDinheiro && <GraficosVisaoGeral pontos={pontos} temCambio={Boolean(v.cambio)} />}

      <SecaoIndicadores titulo="Alunos" itens={v.secoes.usuarios} />
      <SecaoIndicadores titulo="Aprendizagem" descricao="Só o que o app mede hoje: sessões, tempo de estudo e certificados." itens={v.secoes.aprendizagem} />
      {veDinheiro && (
        <SecaoIndicadores
          titulo="Inteligência artificial"
          descricao="Conversas, falhas e tempo de resposta são registrados desde 29/09/2026; antes disso só existia o consumo."
          itens={v.secoes.ia}
        />
      )}
      {veDinheiro && (
        <SecaoIndicadores
          titulo="Financeiro"
          descricao="Receita confirmada pelo Asaas. O resultado ainda não desconta custos fixos (servidor, banco, ferramentas) — eles entram na área Financeiro."
          itens={v.secoes.financeiro}
        />
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
        <h2 className="font-black text-slate-900">O que ainda não é medido</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Exercícios, taxa de acerto e notas por habilidade (vocabulário, gramática, pronúncia): as aulas são conversa livre e isso ainda não é registrado.</li>
          <li>Avaliação das aulas pelo aluno, chamados de suporte e sinalizações de segurança: próximas fases.</li>
          <li>Custos fixos e de ferramentas (hospedagem, banco de dados, domínio, planos contratados): cadastro manual na área Financeiro.</li>
          <li>País ou região dos alunos: não é coletado.</li>
        </ul>
      </section>
    </div>
  );
}
