import { AssistenteVendas } from "@/components/vendas/AssistenteVendas";
import { getConteudoVendas } from "@/lib/data/vendas";

// Assistente de dúvidas acompanha o visitante da página de vendas até o
// pagamento (a conversa continua de uma página para a outra).
export default async function LayoutCheckout({ children }: { children: React.ReactNode }) {
  const c = await getConteudoVendas();
  return (
    <>
      {children}
      {c.assistenteAtivo && <AssistenteVendas pagina="checkout" />}
    </>
  );
}
