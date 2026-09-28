/** @type {import('next').NextConfig} */
const nextConfig = {
  // Há um package-lock.json solto em C:\Users\Willian fraga\ (sobra de outra
  // sessão) que faz o Next inferir a raiz errada do workspace. Fixando aqui.
  outputFileTracingRoot: import.meta.dirname,
  // Build com um processo só: gasta bem menos memória (o computador de
  // desenvolvimento e a VPS têm pouca RAM). Custa alguns segundos de build.
  // Caminho curto até o pagamento (27 set 2026): as 5 etapas antigas de
  // cadastro (idioma/plano/tutor/objetivo/resumo) foram substituídas pela
  // entrevista de boas-vindas depois do pagamento. Os arquivos ficam em
  // src/app/cadastro/onboarding — apagar esta regra as reativa.
  async redirects() {
    return [{ source: "/cadastro/onboarding/:etapa*", destination: "/checkout", permanent: false }];
  },
  experimental: {
    cpus: 1,
    workerThreads: false,
  },
};

export default nextConfig;
