export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-6 px-6 py-16">
      <span className="font-mono text-xs uppercase tracking-widest text-amber-700">
        Fase 1 · MVP 100% automatizado
      </span>
      <h1 className="text-3xl font-bold">Fluência Certificada</h1>
      <p className="text-neutral-600">
        Nenhuma tela de produto foi construída ainda — este é só o ponto de partida
        do código. O blueprint completo (referências, planos, motor de
        certificação, arquitetura e roteiro por fases) está em{" "}
        <code className="rounded bg-neutral-100 px-1 py-0.5">docs/ESCOPO.md</code>.
      </p>
      <p className="text-sm text-neutral-500">
        Decisão de escopo: sem piloto manual e sem revisão humana em etapa nenhuma.
        Cadastro, pagamento (Asaas), aula e certificado precisam rodar sozinhos
        desde o aluno #1 — o único trabalho manual é a divulgação, com QR Code
        rastreável por escola e cupom de desconto embutido — ver seção 08 e 12 do
        escopo.
      </p>
    </main>
  );
}
