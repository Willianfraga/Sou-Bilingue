// Etapa própria do funil, depois do cadastro (ver seção 12 do escopo):
// venda → cadastro → checkout → acesso liberado.
//
// Aqui entra: resumo do pedido (plano + mensalidade), cupom já aplicado (vindo da
// URL do QR Code) ou campo pra digitar um, escolha de método de pagamento e
// integração com o Asaas para cobrança recorrente. O acesso à plataforma só libera
// depois da confirmação automática do pagamento via webhook — nenhuma etapa aqui
// depende de aprovação manual.
export default function Checkout() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-6 px-6 py-16">
      <span className="font-mono text-xs uppercase tracking-widest text-amber-700">
        Checkout · ainda não implementado
      </span>
      <h1 className="text-3xl font-bold">Finalizar matrícula</h1>
      <p className="text-neutral-600">
        Resumo do pedido, cupom de desconto (primeira mensalidade) e pagamento
        recorrente via Asaas entram aqui — ver seção 07 e 12 de{" "}
        <code className="rounded bg-neutral-100 px-1 py-0.5">docs/ESCOPO.md</code>.
      </p>
    </main>
  );
}
