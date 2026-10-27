// Teste às cegas de vozes da tutora (Plano B de docs/plano-acao-email-e-voz.md).
// Gera as mesmas falas em cada fornecedor que tiver chave no .env.local e monta
// amostras-voz/index.html, com os nomes escondidos até o fim da avaliação.
//
//   node scripts/amostras-voz.mjs
//
// Chaves lidas (só as que existirem): ELEVENLABS_API_KEY, GEMINI_API_KEY,
// INWORLD_API_KEY, SPEECHIFY_API_KEY. Nenhum valor é impresso.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const PASTA = "amostras-voz";

// Falas no formato real da tutora: português com o idioma estudado entre aspas.
const FALAS = [
  'Muito bem! Você disse "I goed to the park", mas o certo é "I went to the park". Vamos tentar de novo?',
  'Imagine que estamos no aeroporto. Eu sou a atendente: "Good morning! May I see your passport, please?" Agora é a sua vez.',
  'Parabéns, Lucas! Em espanhol fica assim: "Me gustaría reservar una mesa para dos personas". Repete comigo?',
];

// Um tutor por faixa de idade. Vozes do ElevenLabs = as de produção
// (src/lib/voice/elevenlabs.ts); nas outras, a mais parecida do catálogo.
const TUTORES = [
  { nome: "Clara (adulta)", elevenlabs: "FGY2WhTYpPnrIDTdsKH5", gemini: "Sulafat", inworld: "Ashley", speechify: "carly" },
  { nome: "Diego (jovem)", elevenlabs: "bIHbv24MWmeRgasZH58o", gemini: "Puck", inworld: "Dennis", speechify: "henry" },
  { nome: "Luna (criança)", elevenlabs: "EXAVITQu4vr4xnSDxMaL", gemini: "Leda", inworld: "Hana", speechify: "lisa" },
];

// Preço por 1 milhão de caracteres (US$), conferido nas páginas oficiais em
// 27/10/2026. Gemini cobra por token de áudio: ~US$ 9 por milhão de tokens,
// convertido supondo ~32 tokens por segundo de fala.
const FORNECEDORES = {
  elevenlabs: { nome: "ElevenLabs Flash (hoje)", chave: "ELEVENLABS_API_KEY", precoPorMilhao: 40, extensao: "mp3" },
  gemini: { nome: "Google Gemini 3.8 Flash TTS", chave: "GEMINI_API_KEY", precoPorMilhao: 19, extensao: "wav" },
  inworld: { nome: "Inworld TTS-2", chave: "INWORLD_API_KEY", precoPorMilhao: 25, extensao: "mp3" },
  speechify: { nome: "Speechify Simba 3.5", chave: "SPEECHIFY_API_KEY", precoPorMilhao: 10, extensao: "mp3" },
};

// ~34 mil caracteres de fala da tutora por hora de aula (docs/CUSTOS_IA.md).
const CARACTERES_POR_HORA = 34_000;
const COTACAO = 5.22;

async function lerChaves() {
  const texto = await readFile(".env.local", "utf8");
  const chaves = {};
  for (const linha of texto.split(/\r?\n/)) {
    const achado = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (achado) chaves[achado[1]] = achado[2].replace(/^["']|["']$/g, "");
  }
  return chaves;
}

async function falhar(resposta) {
  const corpo = await resposta.text().catch(() => "");
  throw new Error(`HTTP ${resposta.status}: ${corpo.slice(0, 200)}`);
}

const SINTETIZAR = {
  async elevenlabs(chave, texto, voz) {
    const resposta = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voz}?output_format=mp3_44100_128`, {
      method: "POST",
      headers: { "xi-api-key": chave, "Content-Type": "application/json", Accept: "audio/mpeg" },
      body: JSON.stringify({ text: texto, model_id: "eleven_flash_v2_5" }),
    });
    if (!resposta.ok) await falhar(resposta);
    return Buffer.from(await resposta.arrayBuffer());
  },

  async gemini(chave, texto, voz) {
    const resposta = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
      method: "POST",
      headers: { "x-goog-api-key": chave, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gemini-3.8-flash-tts",
        input: [{
          type: "user_input",
          content: [{
            type: "text",
            text: texto,
            annotations: [{ type: "speech_metadata", style: "professora brasileira simpática e animada; o trecho entre aspas com pronúncia nativa" }],
          }],
        }],
        response_format: { type: "audio" },
        generation_config: { speech_config: [{ voice: voz }] },
      }),
    });
    if (!resposta.ok) await falhar(resposta);
    const json = await resposta.json();
    const audio = json.steps?.flatMap((passo) => passo.content ?? []).find((parte) => parte.data)?.data;
    if (!audio) throw new Error("resposta sem áudio");
    return Buffer.from(audio, "base64");
  },

  async inworld(chave, texto, voz) {
    const resposta = await fetch("https://api.inworld.ai/tts/v1/voice", {
      method: "POST",
      headers: { Authorization: `Basic ${chave}`, "Content-Type": "application/json" },
      body: JSON.stringify({ text: texto, voiceId: voz, modelId: "inworld-tts-2", audioConfig: { audioEncoding: "MP3" } }),
    });
    if (!resposta.ok) await falhar(resposta);
    const json = await resposta.json();
    return Buffer.from(json.audioContent, "base64");
  },

  async speechify(chave, texto, voz) {
    const resposta = await fetch("https://api.speechify.ai/v1/audio/speech", {
      method: "POST",
      headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/json" },
      body: JSON.stringify({ input: texto, voice_id: voz, model: "simba-3.5", language: "pt-BR", audio_format: "mp3" }),
    });
    if (!resposta.ok) await falhar(resposta);
    // A documentação não deixa claro se volta o áudio puro ou JSON com base64.
    if ((resposta.headers.get("content-type") ?? "").includes("json")) {
      const json = await resposta.json();
      return Buffer.from(json.audio_data, "base64");
    }
    return Buffer.from(await resposta.arrayBuffer());
  },
};

function embaralhar(lista) {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

function custoPorHora(precoPorMilhao) {
  const reais = (precoPorMilhao * CARACTERES_POR_HORA / 1_000_000) * COTACAO;
  return reais.toFixed(2).replace(".", ",");
}

function montarPagina(grupos, ativos) {
  const dados = JSON.stringify({
    grupos,
    fornecedores: Object.fromEntries(ativos.map((id) => [id, {
      nome: FORNECEDORES[id].nome,
      custoHora: custoPorHora(FORNECEDORES[id].precoPorMilhao),
    }])),
  });
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Teste de vozes</title>
<style>
  body { margin: 0; background: #f1f0fb; color: #1e1b4b; font-family: Arial, Helvetica, sans-serif; }
  main { max-width: 760px; margin: 0 auto; padding: 24px 16px 64px; }
  h1 { margin: 0 0 8px; }
  .ajuda { color: #475569; line-height: 1.5; }
  section { background: #fff; border-radius: 16px; padding: 20px; margin-top: 20px; }
  h2 { margin: 0 0 4px; font-size: 18px; }
  .fala { color: #475569; font-style: italic; margin: 0 0 16px; }
  .amostra { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; padding: 10px 0; border-top: 1px solid #e2e8f0; }
  .letra { font-weight: 900; width: 28px; }
  audio { flex: 1 1 240px; min-width: 0; }
  .notas button { border: 1px solid #c7d2fe; background: #fff; border-radius: 8px; width: 36px; height: 36px; cursor: pointer; font-weight: 700; }
  .notas button.ativa { background: #4f46e5; color: #fff; border-color: #4f46e5; }
  .revelado { color: #4338ca; font-weight: 700; width: 100%; }
  #revelar { margin-top: 24px; width: 100%; padding: 16px; border: 0; border-radius: 12px; background: #4f46e5; color: #fff; font-size: 16px; font-weight: 700; cursor: pointer; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; }
  th, td { text-align: left; padding: 8px; border-top: 1px solid #e2e8f0; }
</style>
</head>
<body>
<main>
  <h1>Qual voz parece mais humana?</h1>
  <p class="ajuda">Cada grupo tem a mesma fala em vozes diferentes, com os nomes escondidos e em ordem sorteada.
  Ouça e dê uma nota de 1 (robótica) a 5 (parece gente). Repare no português e na pronúncia do trecho em outro idioma.
  No fim, clique em "Revelar" para ver qual era cada uma e quanto custa a hora de aula.</p>
  <div id="grupos"></div>
  <button id="revelar">Revelar as vozes e o resultado</button>
  <section id="resultado" hidden></section>
</main>
<script>
const DADOS = ${dados};
const notas = {};
const raiz = document.getElementById("grupos");
DADOS.grupos.forEach((grupo, g) => {
  const secao = document.createElement("section");
  secao.innerHTML = "<h2>" + grupo.tutor + "</h2><p class='fala'>" + grupo.fala + "</p>";
  grupo.amostras.forEach((amostra, a) => {
    const linha = document.createElement("div");
    linha.className = "amostra";
    linha.innerHTML = "<span class='letra'>" + String.fromCharCode(65 + a) + "</span>" +
      "<audio controls preload='none' src='" + amostra.arquivo + "'></audio><span class='notas'></span>" +
      "<span class='revelado' hidden></span>";
    const caixa = linha.querySelector(".notas");
    for (let n = 1; n <= 5; n++) {
      const botao = document.createElement("button");
      botao.textContent = n;
      botao.onclick = () => {
        notas[g + "-" + a] = { fornecedor: amostra.fornecedor, nota: n };
        caixa.querySelectorAll("button").forEach((b) => b.classList.toggle("ativa", b === botao));
      };
      caixa.appendChild(botao);
    }
    linha.querySelector(".revelado").textContent = DADOS.fornecedores[amostra.fornecedor].nome;
    secao.appendChild(linha);
  });
  raiz.appendChild(secao);
});
document.getElementById("revelar").onclick = () => {
  document.querySelectorAll(".revelado").forEach((e) => (e.hidden = false));
  const soma = {};
  Object.values(notas).forEach(({ fornecedor, nota }) => {
    soma[fornecedor] ??= { total: 0, qtd: 0 };
    soma[fornecedor].total += nota;
    soma[fornecedor].qtd += 1;
  });
  const linhas = Object.entries(DADOS.fornecedores)
    .map(([id, f]) => ({ ...f, media: soma[id] ? soma[id].total / soma[id].qtd : null }))
    .sort((a, b) => (b.media ?? 0) - (a.media ?? 0))
    .map((f) => "<tr><td>" + f.nome + "</td><td>" + (f.media === null ? "sem nota" : f.media.toFixed(1)) +
      "</td><td>R$ " + f.custoHora + "</td></tr>").join("");
  const resultado = document.getElementById("resultado");
  resultado.innerHTML = "<h2>Resultado</h2><table><tr><th>Voz</th><th>Sua nota média</th><th>Voz por hora de aula</th></tr>" +
    linhas + "</table><p class='ajuda'>Custo só da voz, com ~34 mil caracteres de fala por hora e US$ 1 = R$ ${COTACAO.toFixed(2).replace(".", ",")}.</p>";
  resultado.hidden = false;
  resultado.scrollIntoView({ behavior: "smooth" });
};
</script>
</body>
</html>
`;
}

const chaves = await lerChaves();
const ativos = Object.keys(FORNECEDORES).filter((id) => chaves[FORNECEDORES[id].chave]);
const faltando = Object.keys(FORNECEDORES).filter((id) => !ativos.includes(id));
if (faltando.length) {
  console.log(`Sem chave (fica de fora): ${faltando.map((id) => FORNECEDORES[id].chave).join(", ")}`);
}
if (!ativos.length) {
  console.log("Nenhuma chave de voz encontrada no .env.local.");
  process.exit(1);
}

await mkdir(PASTA, { recursive: true });
const grupos = [];
const falhas = [];
for (const [t, tutor] of TUTORES.entries()) {
  for (const [f, fala] of FALAS.entries()) {
    const amostras = [];
    for (const id of ativos) {
      const arquivo = `${id}-${t}-${f}.${FORNECEDORES[id].extensao}`;
      try {
        const audio = await SINTETIZAR[id](chaves[FORNECEDORES[id].chave], fala, tutor[id]);
        await writeFile(join(PASTA, arquivo), audio);
        amostras.push({ fornecedor: id, arquivo });
        console.log(`ok  ${FORNECEDORES[id].nome} · ${tutor.nome} · fala ${f + 1}`);
      } catch (erro) {
        falhas.push(`${FORNECEDORES[id].nome} · ${tutor.nome} · fala ${f + 1}: ${erro.message}`);
      }
    }
    if (amostras.length) grupos.push({ tutor: tutor.nome, fala, amostras: embaralhar(amostras) });
  }
}

await writeFile(join(PASTA, "index.html"), montarPagina(grupos, ativos));
if (falhas.length) console.log(`\nFalhas:\n  ${falhas.join("\n  ")}`);
console.log(`\nPágina do teste: ${join(process.cwd(), PASTA, "index.html")}`);
