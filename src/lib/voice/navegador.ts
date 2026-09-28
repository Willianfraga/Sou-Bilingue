// Voz gratuita do navegador (speechSynthesis), usada nos planos sem voz
// premium. Uma voz do navegador só fala bem um idioma por vez, e o tutor
// mistura português com o idioma estudado — o prompt manda pôr exemplos e
// correções entre aspas. Então: trecho entre aspas no idioma estudado, o resto
// em português do Brasil. Módulo puro (testado em test/onboarding.test.mjs).

export type TrechoDeFala = { texto: string; idioma: string };

// Só aspas duplas: aspas simples confundiriam contrações ("don't", "it's").
const ASPAS = /"([^"]+)"|“([^”]+)”/g;

export function dividirFalaPorIdioma(texto: string, idiomaEstudado: string): TrechoDeFala[] {
  const trechos: TrechoDeFala[] = [];
  const adicionar = (parte: string, idioma: string) => {
    const limpo = parte.trim();
    if (limpo) trechos.push({ texto: limpo, idioma });
  };

  let inicio = 0;
  for (const achado of texto.matchAll(ASPAS)) {
    adicionar(texto.slice(inicio, achado.index), "pt-BR");
    adicionar(achado[1] ?? achado[2] ?? "", idiomaEstudado);
    inicio = (achado.index ?? 0) + achado[0].length;
  }
  adicionar(texto.slice(inicio), "pt-BR");
  return trechos;
}
