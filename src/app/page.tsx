export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-6 px-6 py-16">
      <span className="font-mono text-xs uppercase tracking-widest text-amber-700">
        Fase 0 · piloto manual
      </span>
      <h1 className="text-3xl font-bold">Fluência Certificada</h1>
      <p className="text-neutral-600">
        Nenhuma tela de produto foi construída ainda — este é só o ponto de partida
        do código. O blueprint completo (referências, planos, motor de
        certificação, arquitetura e roteiro por fases) está em{" "}
        <code className="rounded bg-neutral-100 px-1 py-0.5">docs/ESCOPO.md</code>.
      </p>
      <p className="text-sm text-neutral-500">
        Antes de construir qualquer tela real, o roteiro pede um piloto manual com
        20–50 alunos para validar se o certificado sozinho sustenta o hábito de
        estudo — ver seção 08 do escopo.
      </p>
    </main>
  );
}
