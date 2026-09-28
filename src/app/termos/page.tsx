import type { Metadata } from "next";
import { PaginaLegal } from "@/components/vendas/PaginaLegal";

export const metadata: Metadata = { title: "Termos de Uso — Sou Bilíngue" };

// Texto preliminar — descreve as regras que o app já aplica. Revisão jurídica
// pendente (docs/sales-page.md → Pendências).
export default function Termos() {
  return (
    <PaginaLegal titulo="Termos de Uso" atualizado="27 de setembro de 2026">
      <h2>O serviço</h2>
      <p>
        O Sou Bilíngue oferece prática de idiomas por conversa com professores virtuais baseados em inteligência artificial.
        Os professores virtuais não são pessoas. Eles podem cometer erros; use o bom senso e, em temas importantes, confirme
        as informações em outras fontes.
      </p>

      <h2>Conta</h2>
      <p>
        Você é responsável pelos dados informados e pela segurança da sua senha. Menores de 18 anos só podem usar o serviço
        com consentimento do responsável legal.
      </p>

      <h2>Planos e pagamento</h2>
      <ul>
        <li>Os planos são mensais, com cobrança automática pelo Asaas (Pix, cartão ou boleto).</li>
        <li>O 1º mês tem o desconto informado na página de planos; do 2º mês em diante vale o preço cheio exibido antes da compra.</li>
        <li>Cada plano inclui uma quantidade de horas de conversa por mês. Horas extras podem ser compradas à parte.</li>
        <li>O acesso é liberado após a confirmação do pagamento.</li>
      </ul>

      <h2 id="cancelamento">Cancelamento e reembolso</h2>
      <p>Cancelar a renovação e pedir reembolso são coisas diferentes, e as duas ficam em Minha assinatura, no próprio app:</p>
      <ul>
        <li>
          <strong>Cancelar a renovação</strong> — quando quiser. As cobranças seguintes são canceladas na hora e o acesso
          continua até o fim do período já pago. Não devolve o valor já pago.
        </li>
        <li>
          <strong>Reembolso por arrependimento</strong> — em até 7 dias corridos após a confirmação do 1º pagamento (até
          23h59 do 7º dia, horário de Brasília), o reembolso é integral, sem precisar informar motivo, pelo mesmo meio de
          pagamento. O pedido gera um protocolo; a renovação é cancelada junto e o acesso termina quando o estorno for
          confirmado pelo Asaas.
        </li>
        <li>
          <strong>Depois dos 7 dias</strong> — não há reembolso automático do período atual. Situações como cobrança indevida,
          cobrança em duplicidade, falha na prestação do serviço ou descumprimento da oferta podem ser enviadas para análise,
          informando o motivo. Os direitos previstos em lei continuam valendo.
        </li>
        <li>O andamento do pedido (solicitado, em análise, em processamento, reembolsado ou negado) aparece em Minha assinatura.</li>
      </ul>

      <h2>Certificado mensal</h2>
      <p>
        O certificado mensal comprova a constância de prática no Sou Bilíngue (meta cumprida em todas as semanas do mês) e
        pode ser verificado por código. Ele não é diploma nem certificação oficial de proficiência.
      </p>

      <h2>Uso adequado</h2>
      <p>
        Não é permitido usar o serviço para fins ilegais, tentar acessar dados de outros usuários ou sobrecarregar o sistema.
        Contas que fizerem isso podem ser suspensas.
      </p>

      <h2>Privacidade</h2>
      <p>
        O uso dos seus dados está descrito na <a href="/privacidade" className="font-bold text-violet-700 hover:underline">Política de Privacidade</a>.
      </p>
    </PaginaLegal>
  );
}
