// Permite que os testes (node --test, Node 24 com remoção de tipos nativa)
// importem módulos .ts do app: resolve o alias "@/" do tsconfig para src/ e
// completa a extensão .ts que o bundler do Next dispensa.
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const SRC = path.resolve(fileURLToPath(import.meta.url), "..", "..", "..", "src");

function comExtensao(caminho) {
  const candidatos = path.extname(caminho) ? [caminho] : [`${caminho}.ts`, path.join(caminho, "index.ts")];
  return candidatos.find((c) => existsSync(c)) ?? null;
}

export async function resolve(especificador, contexto, proximo) {
  if (especificador.startsWith("@/")) {
    const alvo = comExtensao(path.join(SRC, especificador.slice(2)));
    if (alvo) return proximo(pathToFileURL(alvo).href, contexto);
  }
  if (
    (especificador.startsWith("./") || especificador.startsWith("../")) &&
    contexto.parentURL?.endsWith(".ts") &&
    !path.extname(especificador)
  ) {
    const base = path.dirname(fileURLToPath(contexto.parentURL));
    const alvo = comExtensao(path.resolve(base, especificador));
    if (alvo) return proximo(pathToFileURL(alvo).href, contexto);
  }
  return proximo(especificador, contexto);
}
