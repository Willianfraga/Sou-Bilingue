/** @type {import('next').NextConfig} */
const nextConfig = {
  // Há um package-lock.json solto em C:\Users\Willian fraga\ (sobra de outra
  // sessão) que faz o Next inferir a raiz errada do workspace. Fixando aqui.
  outputFileTracingRoot: import.meta.dirname,
  // Build com um processo só: gasta bem menos memória (o computador de
  // desenvolvimento e a VPS têm pouca RAM). Custa alguns segundos de build.
  experimental: {
    cpus: 1,
    workerThreads: false,
  },
};

export default nextConfig;
