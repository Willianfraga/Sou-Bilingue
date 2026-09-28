// Cancelamento pelo aluno, depoimentos com autorização, vídeo e caminho
// curto até o pagamento.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { assinaturaDaAcesso, calcularAcessoAte, formatarData } from "../src/lib/billing/regras-cancelamento.ts";
import { planoDaCertificacao } from "../src/lib/billing/planos.ts";
import { validarDepoimentoDoAluno, videoIncorporado } from "../src/lib/vendas/conteudo.ts";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ler = (rel) => readFileSync(path.join(RAIZ, rel), "utf8");
const dia = (s) => new Date(`${s}T12:00:00Z`);

describe("cancelamento: até quando vale o acesso", () => {
  test("usa o fim do ciclo quando ele é o mais distante", () => {
    assert.equal(calcularAcessoAte({ cicloFim: "2026-10-20", ultimoPagamento: "2026-09-10", hoje: dia("2026-09-27") }), "2026-10-20");
  });

  test("ciclo desatualizado: vale um mês após o último pagamento", () => {
    assert.equal(calcularAcessoAte({ cicloFim: "2026-09-23", ultimoPagamento: "2026-09-25", hoje: dia("2026-09-27") }), "2026-10-25");
  });

  test("nunca antes de hoje", () => {
    assert.equal(calcularAcessoAte({ cicloFim: "2026-01-01", ultimoPagamento: null, hoje: dia("2026-09-27") }), "2026-09-27");
  });

  test("fim de mês: 31/01 + 1 mês não quebra", () => {
    assert.match(calcularAcessoAte({ cicloFim: null, ultimoPagamento: "2026-01-31", hoje: dia("2026-01-31") }), /^2026-03-0[23]$/);
  });

  test("cancelada dá acesso até acesso_ate (inclusive) e depois não", () => {
    const sub = { status: "ativa", cancelamento_solicitado_em: "2026-09-27T10:00:00Z", acesso_ate: "2026-10-20" };
    assert.equal(assinaturaDaAcesso(sub, dia("2026-10-20")), true);
    assert.equal(assinaturaDaAcesso(sub, dia("2026-10-21")), false);
  });

  test("não cancelada e ativa: acesso normal; pendente: sem acesso", () => {
    assert.equal(assinaturaDaAcesso({ status: "ativa" }, dia("2030-01-01")), true);
    assert.equal(assinaturaDaAcesso({ status: "pendente" }, dia("2026-09-27")), false);
  });

  test("data em formato brasileiro", () => {
    assert.equal(formatarData("2026-10-20"), "20/10/2026");
  });
});

describe("cancelamento (estático)", () => {
  test("Asaas: cancelar é DELETE, conforme a documentação oficial", () => {
    const cliente = ler("src/lib/asaas/client.ts");
    assert.match(cliente, /request<\{ deleted: boolean; id: string \}>\("DELETE", `\/subscriptions\/\$\{subscriptionId\}`\)/);
    assert.equal(/status: "CANCELLED"/.test(cliente), false);
  });

  test("acesso da assinatura ativa passa pela regra de cancelamento", () => {
    assert.match(ler("src/lib/billing/subscription.ts"), /if \(!assinaturaDaAcesso\(data, new Date\(\)\)\) return null;/);
  });

  test("página de cancelamento fica fora de /aluno (funciona antes da entrevista)", () => {
    const pagina = ler("src/app/assinatura/page.tsx");
    assert.match(pagina, /await requirePapel\("aluno"\)/);
    assert.match(pagina, /name="confirmo" value="sim" required/);
  });

  test("migration 0017 só acrescenta colunas e tabela", () => {
    const sql = ler("supabase/migrations/0017_cancelamento_e_depoimentos.sql");
    assert.equal(/drop table|delete from|truncate|drop column/i.test(sql), false);
    assert.match(sql, /add column if not exists acesso_ate date/);
  });
});

describe("depoimentos com autorização", () => {
  test("sem autorização não envia", () => {
    const r = validarDepoimentoDoAluno({ nome: "Ana", contexto: "", texto: "Perdi o medo de falar inglês.", autorizo: null });
    assert.equal(r.ok, false);
  });

  test("texto curto demais é recusado; HTML é removido", () => {
    assert.equal(validarDepoimentoDoAluno({ nome: "Ana", contexto: "", texto: "Legal", autorizo: "sim" }).ok, false);
    const r = validarDepoimentoDoAluno({ nome: "<b>Ana</b>", contexto: "", texto: "<script>x</script> Perdi o medo de falar.", autorizo: "sim" });
    assert.equal(r.ok, true);
    assert.equal(r.dados.nome_exibicao.includes("<"), false);
    assert.equal(r.dados.texto.includes("<"), false);
  });

  test("RLS: aluno só envia o próprio, autorizado e pendente; só admin publica", () => {
    const sql = ler("supabase/migrations/0017_cancelamento_e_depoimentos.sql");
    assert.match(sql, /with check \(auth\.uid\(\) = aluno_id and autorizou_publicacao and status = 'pendente'\)/);
    assert.match(sql, /with check \(app\.is_admin\(\) or \(auth\.uid\(\) = aluno_id and status = 'retirado'\)\)/);
  });

  test("página de vendas lê só aprovados e só campos públicos", () => {
    const dados = ler("src/lib/data/depoimentos.ts");
    assert.match(dados, /\.select\("nome_exibicao, contexto, texto"\)\s*\.eq\("status", "aprovado"\)/);
  });

  test("menor de idade não autoriza sozinho", () => {
    assert.match(ler("src/app/aluno/perfil/actions.ts"), /if \(!aluno\?\.maior_de_idade/);
  });
});

describe("vídeo da aula", () => {
  test("aceita YouTube (vários formatos) e Vimeo, com player sem cookies", () => {
    assert.equal(videoIncorporado("https://www.youtube.com/watch?v=dQw4w9WgXcQ")?.embed, "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&rel=0");
    assert.equal(videoIncorporado("https://youtu.be/dQw4w9WgXcQ")?.id, "dQw4w9WgXcQ");
    assert.equal(videoIncorporado("https://youtube.com/shorts/dQw4w9WgXcQ")?.id, "dQw4w9WgXcQ");
    assert.equal(videoIncorporado("https://vimeo.com/123456789")?.embed, "https://player.vimeo.com/video/123456789?dnt=1&autoplay=1");
  });

  test("recusa outros sites, http e ids inválidos", () => {
    for (const ruim of ["https://evil.com/watch?v=dQw4w9WgXcQ", "http://youtu.be/dQw4w9WgXcQ", "https://youtu.be/<script>", "javascript:alert(1)", "texto"]) {
      assert.equal(videoIncorporado(ruim), null, ruim);
    }
  });
});

describe("caminho curto até o pagamento", () => {
  test("cadastro cria o aluno com valores iniciais", () => {
    const perfil = ler("src/lib/auth/profile.ts");
    assert.match(perfil, /return garantirAluno\(userId\);/);
    assert.match(perfil, /onConflict: "id", ignoreDuplicates: true/);
  });

  test("webhook grava o plano da certificação quando o pagamento é confirmado", () => {
    assert.equal(planoDaCertificacao("essencial"), "basico");
    assert.equal(planoDaCertificacao("fluencia"), "intermediario");
    assert.equal(planoDaCertificacao("premium"), "avancado");
    assert.match(ler("src/app/api/webhooks/asaas/route.ts"), /plano: planoDaCertificacao\(plano\.nome\)/);
  });

  test("confirmação de e-mail leva ao checkout", () => {
    assert.match(ler("src/app/auth/callback/route.ts"), /NextResponse\.redirect\(`\$\{base\}\/checkout`\)/);
  });
});
