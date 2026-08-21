import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { NOME_DO_IDIOMA, NOME_DO_PLANO, type Idioma, type Plano } from "@/lib/types";

function nomeDoMes(dataIso: string): string {
  const texto = new Date(`${dataIso}T00:00:00`).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

// Rota pública (sem login) para conferir a autenticidade de um certificado —
// o código vem impresso no PDF (src/lib/certificacao/pdf.ts). Qualquer pessoa
// (escola, empregador, o próprio responsável) pode acessar sem depender só
// da palavra do aluno.
//
// Cliente admin porque não há sessão aqui — a rota é pública por design
// (ESCOPO.md § 05/§ 06). Em compensação, a consulta filtra só pelo código
// exato e devolve apenas os campos que já são pensados pra serem públicos
// (nome, idioma, mês, plano) — nunca e-mail, CPF ou qualquer outro dado do
// aluno.
export default async function VerificarCertificado({
  params,
}: {
  params: Promise<{ codigo: string }>;
}) {
  const { codigo } = await params;

  const supabase = createSupabaseAdminClient();
  const { data: certificado, error } = await supabase
    .from("certificados")
    .select("mes_referencia, idioma, plano, emitido_em, aluno_id")
    .eq("codigo_verificacao", codigo)
    .maybeSingle();

  // Falha de consulta (banco fora do ar, chave inválida etc.) não pode virar
  // "código não encontrado" — são coisas diferentes: uma é "este certificado
  // não existe", a outra é "não conseguimos checar agora". Confundir as duas
  // já causou um bug real aqui (chave de serviço expirada virando falso
  // negativo silencioso).
  if (error) {
    console.error("Falha ao verificar certificado:", error.message);
    return (
      <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-16">
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-5 py-4">
          <p className="font-semibold text-amber-800">
            Não foi possível verificar agora
          </p>
          <p className="mt-1 text-sm text-amber-700">
            Tente novamente em instantes.
          </p>
        </div>
      </main>
    );
  }

  let nomeAluno: string | null = null;
  if (certificado) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("nome")
      .eq("id", certificado.aluno_id)
      .maybeSingle();
    nomeAluno = profile?.nome ?? null;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-16">
      <span className="font-mono text-xs uppercase tracking-widest text-neutral-400">
        Verificação de certificado
      </span>

      {!certificado ? (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-5 py-4">
          <p className="font-semibold text-red-800">
            Código não encontrado
          </p>
          <p className="mt-1 text-sm text-red-700">
            O código <span className="font-mono">{codigo}</span> não
            corresponde a nenhum certificado emitido pela SouBilingue.
          </p>
        </div>
      ) : (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-5 py-6">
          <p className="font-semibold text-emerald-800">Certificado autêntico</p>
          <div className="mt-4 flex flex-col gap-2 text-neutral-800">
            <p>
              <span className="text-neutral-500">Aluno:</span>{" "}
              <strong>{nomeAluno ?? "—"}</strong>
            </p>
            <p>
              <span className="text-neutral-500">Idioma:</span>{" "}
              {NOME_DO_IDIOMA[certificado.idioma as Idioma]}
            </p>
            <p>
              <span className="text-neutral-500">Plano:</span>{" "}
              {NOME_DO_PLANO[certificado.plano as Plano]}
            </p>
            <p>
              <span className="text-neutral-500">Mês de referência:</span>{" "}
              {nomeDoMes(certificado.mes_referencia)}
            </p>
            <p>
              <span className="text-neutral-500">Emitido em:</span>{" "}
              {certificado.emitido_em.slice(0, 10)}
            </p>
            <p className="mt-2 font-mono text-xs text-neutral-500">
              Código: {codigo}
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
