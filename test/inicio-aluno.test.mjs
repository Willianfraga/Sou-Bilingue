// Tela inicial do aluno: menu bento, tutor e "Iniciar minha aula",
// personalizada pela entrevista de boas-vindas.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { ITENS_DO_MENU, relogio, resumirEntrevista, temaDoDia } from "../src/lib/aluno/inicio.ts";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ler = (rel) => readFileSync(path.join(RAIZ, rel), "utf8");

describe("personalização pela entrevista", () => {
  const respostas = {
    nomePreferido: "Ju Silva",
    idiomaAlvo: "ingles",
    nivel: "iniciante",
    objetivos: ["viajar", "trabalho"],
    temasConversa: ["viagens", "musica"],
  };

  test("usa o nome preferido (primeiro nome), idioma, nível curto e objetivo", () => {
    const r = resumirEntrevista(respostas, "Juliana Cadastro", new Date("2026-10-03T12:00:00Z"));
    assert.equal(r.nome, "Ju");
    assert.equal(r.idioma, "Inglês");
    assert.equal(r.nivel, "Iniciante");
    assert.equal(r.objetivo, "Viajar");
    assert.ok(r.temaDoDia);
  });

  test("sem entrevista: usa o primeiro nome do cadastro e não inventa nada", () => {
    const r = resumirEntrevista(null, "Willian Fraga Cavalcante");
    assert.deepEqual(r, { nome: "Willian", idioma: null, nivel: null, objetivo: null, temaDoDia: null });
  });

  test("'Prefiro não responder' não aparece na tela", () => {
    const r = resumirEntrevista({ nivel: "prefiro_nao_responder", objetivos: ["prefiro_nao_responder"] }, "Ana");
    assert.equal(r.nivel, null);
    assert.equal(r.objetivo, null);
  });

  test("tema do dia muda de um dia para o outro e é estável no mesmo dia", () => {
    const d1 = new Date("2026-10-03T08:00:00Z");
    const d1b = new Date("2026-10-03T20:00:00Z");
    const d2 = new Date("2026-10-04T08:00:00Z");
    assert.equal(temaDoDia(respostas, d1), temaDoDia(respostas, d1b));
    assert.notEqual(temaDoDia(respostas, d1), temaDoDia(respostas, d2));
  });
});

describe("tela da aula", () => {
  test("relógio da sessão", () => {
    assert.equal(relogio(0), "00:00");
    assert.equal(relogio(754), "12:34");
    assert.equal(relogio(3765), "1:02:45");
    assert.equal(relogio(-5), "00:00");
  });

  test("aula sem seletor de idioma/tutor e sem cartão de horas; relógio no lugar", () => {
    const aula = ler("src/app/aluno/aula/page.tsx");
    assert.equal(/SeletorIdioma|SeletorTutor/.test(aula), false);
    const tracker = ler("src/components/aluno/HourUsageTracker.tsx");
    assert.match(tracker, /role="timer"/);
    assert.equal(tracker.includes("Horas de Conversação"), false);
    assert.match(tracker, /useSessaoDeAula\(contando\)/, "a contagem de horas segue o relógio");
  });

  test("tutor e horas ficam no menu", () => {
    const hrefs = ITENS_DO_MENU.map((i) => i.href);
    assert.ok(hrefs.includes("/aluno/tutor"));
    assert.ok(hrefs.includes("/aluno/horas"));
    assert.match(ler("src/app/aluno/tutor/actions.ts"), /redirect\("\/aluno"\)/);
  });
});

describe("menu bento e tela inicial", () => {
  test("todo atalho do menu leva a uma página que existe", () => {
    for (const item of ITENS_DO_MENU) {
      const rota = item.href.split("#")[0];
      const arquivo = rota === "/assinatura" ? "src/app/assinatura/page.tsx" : `src/app${rota}/page.tsx`;
      assert.ok(existsSync(path.join(RAIZ, arquivo)), item.href);
    }
  });

  test("âncoras usadas pelo menu existem nas páginas", () => {
    assert.match(ler("src/app/aluno/licoes/page.tsx"), /id="escolher-idioma"/);
    assert.match(ler("src/app/aluno/perfil/page.tsx"), /id="preferencias"/);
  });

  test("área do aluno usa o menu bento (sem barra lateral)", () => {
    const layout = ler("src/app/aluno/layout.tsx");
    assert.match(layout, /EstruturaAluno/);
    assert.equal(layout.includes("SideNav"), false);
    const menu = ler("src/components/aluno/MenuBento.tsx");
    assert.match(menu, /aria-expanded=\{aberto\}/);
    assert.match(menu, /Escape/);
  });

  test("tela inicial: tutor + botão grande 'Iniciar minha aula' + entrevista", () => {
    const p = ler("src/app/aluno/page.tsx");
    assert.match(p, /href="\/aluno\/aula"/);
    assert.match(p, /Iniciar minha aula/);
    assert.match(p, /resumirEntrevista\(onboarding\?\.respostas/);
    assert.match(p, /MenuBento/);
    assert.ok(existsSync(path.join(RAIZ, "src/app/aluno/progresso/page.tsx")), "progresso continua acessível");
  });
});

describe("aula resistente a falhas e relógio", () => {
  const aula = () => ler("src/components/aluno/AulaChat.tsx");
  test("transcrição tem limite de tempo (não trava em 'Transcrevendo...')", () => {
    assert.match(aula(), /fetch\("\/api\/aula\/transcrever", \{[^}]*signal: AbortSignal\.timeout\(LIMITE_TRANSCRICAO_MS\)/);
  });
  test("depois de falhas seguidas usa o reconhecimento do navegador", () => {
    assert.match(aula(), /falhasTranscricaoRef\.current >= FALHAS_PARA_PLANO_B/);
    assert.match(aula(), /usarReconhecimentoNativoRef\.current\) \{\s*ouvirComReconhecimentoNativo\(\)/);
  });
  test("relógio só corre com a conversa ativa (para ao pausar)", () => {
    const wrapper = ler("src/components/aluno/AulaChatComHoras.tsx");
    assert.match(wrapper, /e === "falando" \|\| e === "ouvindo" \|\| e === "pensando"/);
    assert.match(wrapper, /contando=\{conversaAtiva\}/);
    const tracker = ler("src/components/aluno/HourUsageTracker.tsx");
    assert.match(tracker, /if \(!contando\) return;/);
  });
});
