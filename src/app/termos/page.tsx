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
        <li>Para cancelar, fale com o suporte pelos contatos da página inicial.</li>
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
