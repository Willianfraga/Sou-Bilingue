/** @type {import('next').NextConfig} */
const nextConfig = {
  // Há um package-lock.json solto em C:\Users\Willian fraga\ (sobra de outra
  // sessão) que faz o Next inferir a raiz errada do workspace. Fixando aqui.
  outputFileTracingRoot: import.meta.dirname,
};

export default nextConfig;
