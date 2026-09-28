import type { Metadata } from "next";
import Link from "next/link";
import { AssistenteVendas } from "@/components/vendas/AssistenteVendas";
import { PaginaLegal } from "@/components/vendas/PaginaLegal";
import { PRAZO_ARREPENDIMENTO_DIAS } from "@/lib/billing/regras-reembolso";
import { getConteudoVendas } from "@/lib/data/vendas";

export const metadata: Metadata = {
  title: "Política de Cancelamento e Reembolso — Sou Bilíngue",
  description: "Como cancelar a assinatura e pedir reembolso no Sou Bilíngue, conforme o Código de Defesa do Consumidor.",
};
export const dynamic = "force-dynamic";

// Política pública. Descreve o que o app realmente faz (docs/refund-policy.md)
// com base no CDC (Lei 8.078/1990) e no Decreto 7.962/2013 (comércio
// eletrônico). Revisão jurídica pendente — ver docs/refund-policy.md.
export default async function PoliticaDeReembolso() {
  const c = await getConteudoVendas();
  return (
    <>
      <PaginaLegal titulo="Política de Cancelamento e Reembolso" atualizado="27 de setembro de 2026">
        <section aria-label="Resumo" className="grid gap-3 sm:grid-cols-3">
          {[
            ["✋", "Cancelar a renovação", "Quando quiser, pelo app. As próximas cobranças param na hora; o acesso segue até o fim do período pago."],
            ["↩️", `Arrependimento em ${PRAZO_ARREPENDIMENTO_DIAS} dias`, "Reembolso integral do 1º pagamento, sem precisar explicar o motivo."],
            ["🔎", "Depois do prazo", "Cobrança indevida, duplicada ou falha no serviço: envie para análise."],
          ].map(([icone, titulo, texto]) => (
            <div key={titulo} className="rounded-2xl bg-violet-50 p-4 ring-1 ring-violet-100">
              <p aria-hidden className="text-2xl">{icone}</p>
              <p className="mt-2 font-black text-slate-900">{titulo}</p>
              <p className="mt-1 text-sm text-slate-600">{texto}</p>
            </div>
          ))}
        </section>

        <h2>1. Cancelar e pedir reembolso são coisas diferentes</h2>
        <ul>
          <li>
            <strong>Cancelar a renovação</strong> impede as próximas cobranças. Não devolve o que já foi pago.
          </li>
          <li>
            <strong>Pedir reembolso</strong> é pedir a devolução de um pagamento já feito.
          </li>
        </ul>
        <p>
          As duas ações ficam no próprio app, em <strong>Minha assinatura</strong>, com botões separados. Você não precisa falar com
          ninguém nem justificar o cancelamento.
        </p>

        <h2>2. Cancelar a renovação</h2>
        <ul>
          <li>Pode ser feito a qualquer momento, sem multa e sem fidelidade.</li>
          <li>A assinatura recorrente é encerrada na hora no provedor de pagamento (Asaas): nenhuma nova cobrança é feita.</li>
          <li>Você continua com acesso até o fim do período que já pagou.</li>
          <li>Seu histórico, perfil e certificados continuam guardados. Para voltar, é só assinar de novo.</li>
        </ul>

        <h2 id="arrependimento">3. Direito de arrependimento: {PRAZO_ARREPENDIMENTO_DIAS} dias</h2>
        <p>
          A assinatura é contratada pela internet. Por isso, você pode desistir em até {PRAZO_ARREPENDIMENTO_DIAS} dias, conforme o
          art. 49 do Código de Defesa do Consumidor e o art. 5º do Decreto 7.962/2013.
        </p>
        <ul>
          <li>
            <strong>Como contamos o prazo:</strong> {PRAZO_ARREPENDIMENTO_DIAS} dias corridos a partir da data em que o 1º pagamento é
            confirmado, que é quando o acesso é liberado. O prazo vale até as 23h59 do {PRAZO_ARREPENDIMENTO_DIAS}º dia, horário de
            Brasília. Exemplo: pagamento confirmado em 10/09 dá direito até 17/09, às 23h59.
          </li>
          <li>
            <strong>Valor:</strong> reembolso integral do que foi pago, sem descontos e sem multa.
          </li>
          <li>
            <strong>Motivo:</strong> não é obrigatório. Se quiser, conte o motivo para nos ajudar a melhorar.
          </li>
          <li>
            <strong>Como pedir:</strong> em Minha assinatura, toque em “Solicitar reembolso”. Por segurança, pedimos que confirme sua
            senha.
          </li>
          <li>
            <strong>Confirmação:</strong> o pedido recebe na hora um <strong>número de protocolo</strong>. O andamento aparece em Minha
            assinatura.
          </li>
          <li>
            <strong>O que acontece depois:</strong>
            <ul>
              <li>a renovação é cancelada junto com o pedido;</li>
              <li>
                o pedido de estorno é enviado imediatamente ao provedor de pagamento, para devolução pelo mesmo meio usado na compra
                (Decreto 7.962/2013, art. 5º, § 3º);
              </li>
              <li>o acesso termina quando o provedor confirma o estorno.</li>
            </ul>
          </li>
          <li>
            <strong>Nova assinatura:</strong> se você assinar de novo mais tarde, o prazo de {PRAZO_ARREPENDIMENTO_DIAS} dias vale
            para essa nova contratação.
          </li>
          <li>
            <strong>Horas extras:</strong> o direito de arrependimento também vale para compras de horas extras. Peça pelos canais
            da página de <Link href="/contato">Contato</Link>, informando a compra.
          </li>
        </ul>

        <h2 id="depois-do-prazo">4. Depois dos {PRAZO_ARREPENDIMENTO_DIAS} dias</h2>
        <p>
          Se você só mudou de ideia, <strong>não há reembolso automático do período atual</strong>. Você pode cancelar a renovação a
          qualquer momento, e o acesso segue até o fim do período pago.
        </p>
        <p>Algumas situações dão direito à devolução em qualquer momento. Elas podem ser enviadas para análise:</p>
        <ul>
          <li>
            <strong>Cobrança indevida ou em duplicidade:</strong> o valor cobrado a mais é devolvido. O CDC (art. 42, parágrafo único)
            prevê a devolução em dobro do que foi pago indevidamente, com correção e juros, salvo engano justificável.
          </li>
          <li>
            <strong>Falha na prestação do serviço:</strong> se o serviço não funcionar como deveria, você pode escolher entre ter o
            serviço refeito, receber de volta o que pagou ou ter um abatimento proporcional do preço (CDC, art. 20).
          </li>
          <li>
            <strong>Oferta não cumprida:</strong> se algo anunciado não for entregue, você tem os direitos do art. 35 do CDC. Entre eles
            está a devolução do que pagou, com atualização monetária.
          </li>
          <li>
            <strong>Compra que você não reconhece:</strong> será analisada com prioridade.
          </li>
        </ul>
        <p>
          <strong>Como pedir:</strong> em Minha assinatura → “Solicitar reembolso”, escolha o motivo e, se quiser, descreva o que
          aconteceu. O pedido recebe um protocolo. Nossa equipe analisa e responde pelo e-mail da sua conta, e o andamento aparece em
          Minha assinatura.
        </p>

        <h2>5. Situação do seu pedido</h2>
        <ul>
          <li><strong>Solicitado:</strong> recebemos o pedido.</li>
          <li><strong>Em análise:</strong> pedido feito depois do prazo, com a equipe.</li>
          <li><strong>Aprovado:</strong> a equipe aprovou e o estorno está sendo enviado.</li>
          <li><strong>Em processamento:</strong> o estorno foi enviado ao provedor de pagamento.</li>
          <li><strong>Reembolsado:</strong> o provedor confirmou a devolução.</li>
          <li><strong>Negado:</strong> o pedido não se enquadra nas hipóteses acima; a resposta explica o motivo.</li>
        </ul>
        <p>
          “Solicitado” não é o mesmo que “reembolsado”: só marcamos como reembolsado quando o provedor de pagamento confirma. O prazo
          para o valor aparecer depende do meio de pagamento e do seu banco. No cartão de crédito, o estorno aparece na fatura.
        </p>

        <h2>6. Seus direitos continuam valendo</h2>
        <p>
          Nada nesta política limita os direitos previstos no Código de Defesa do Consumidor. Se não ficar satisfeito com a nossa
          resposta, você pode procurar o Procon da sua cidade ou registrar uma reclamação em{" "}
          <a href="https://www.consumidor.gov.br" target="_blank" rel="noopener noreferrer">consumidor.gov.br</a>.
        </p>

        <h2>7. Dúvidas</h2>
        <p>
          Veja a página de <Link href="/contato">Contato</Link> ou pergunte ao assistente virtual.
          {c.suporteEmail && <> Você também pode escrever para <a href={`mailto:${c.suporteEmail}`}>{c.suporteEmail}</a>.</>} Os
          termos completos estão em <Link href="/termos">Termos de Uso</Link>.
        </p>
      </PaginaLegal>
      {c.assistenteAtivo && <AssistenteVendas pagina="reembolso" />}
    </>
  );
}
