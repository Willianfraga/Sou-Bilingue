import Link from "next/link";

// Esta rota ("/") vai virar a página de vendas pública — destino real do QR Code
// do panfleto, com a apresentação do produto e os 3 planos (ver seção 12 do
// escopo: QR → página de vendas → cadastro → /checkout → acesso liberado).
// Por enquanto é só uma tela de status, sem conteúdo de venda real.
const interfaces = [
  { href: "/aluno", label: "Interface do aluno" },
  { href: "/responsavel", label: "Interface do responsável" },
  { href: "/admin", label: "Interface do criador" },
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-6 px-6 py-16">
      <span className="font-mono text-xs uppercase tracking-widest text-amber-700">
        Fase 1 · MVP 100% automatizado
      </span>
      <h1 className="text-3xl font-bold">SouBilingue</h1>
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
      <p className="text-sm text-neutral-500">
        Esta página vai virar a página de vendas pública (destino do QR Code); o
        cadastro e o <code className="rounded bg-neutral-100 px-1 py-0.5">/checkout</code>{" "}
        são etapas separadas depois da escolha do plano.
      </p>

      <div className="mt-4 rounded-lg border border-dashed border-neutral-300 p-4">
        <p className="mb-3 font-mono text-xs uppercase tracking-widest text-neutral-400">
          Atalhos de dev — remover quando existir login de verdade
        </p>
        <ul className="flex flex-col gap-2">
          {interfaces.map((item) => (
            <li key={item.href}>
              <Link href={item.href} className="text-sm text-teal-700 underline">
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
