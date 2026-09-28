import type { Metadata } from "next";
import { PaginaLegal } from "@/components/vendas/PaginaLegal";

export const metadata: Metadata = { title: "Política de Privacidade — Sou Bilíngue" };

// Descreve o que o código coleta de fato (revisar junto com o código ao
// mudar qualquer coleta). Texto preliminar — revisão jurídica pendente.
export default function Privacidade() {
  return (
    <PaginaLegal titulo="Política de Privacidade" atualizado="27 de setembro de 2026">
      <p>
        Esta política explica quais dados o Sou Bilíngue usa, para quê e com quem são compartilhados, nos termos da Lei
        Geral de Proteção de Dados (Lei 13.709/2018).
      </p>

      <h2>Dados que usamos</h2>
      <ul>
        <li><strong>Conta:</strong> nome, e-mail e senha (a senha é guardada de forma criptografada pelo provedor de autenticação).</li>
        <li><strong>Preferências de aula:</strong> respostas da entrevista de boas-vindas — como prefere ser chamado, faixa etária (opcional), idioma, nível, objetivos, interesses, forma de correção e temas a evitar. Perguntas pessoais têm a opção &quot;Prefiro não responder&quot;.</li>
        <li><strong>Aulas:</strong> o que você fala e escreve na aula é enviado aos provedores de inteligência artificial para transcrever sua voz e gerar as respostas do professor. O app guarda fatos que você compartilhar (por exemplo, &quot;gosto de futebol&quot;) para personalizar aulas futuras, e o tempo de uso.</li>
        <li><strong>Pagamentos:</strong> processados pelo Asaas. Não recebemos nem guardamos dados de cartão; guardamos identificadores, valores e status das cobranças.</li>
        <li><strong>Página de vendas:</strong> métricas anônimas (páginas vistas, cliques e parâmetros de campanha como utm_source), sem nome, e-mail ou cookies de terceiros.</li>
      </ul>

      <h2>Para que usamos</h2>
      <ul>
        <li>Prestar as aulas e personalizá-las ao seu perfil.</li>
        <li>Controlar plano, horas, pagamentos e certificados.</li>
        <li>Segurança, prevenção de abuso e cumprimento de obrigações legais.</li>
        <li>Entender, de forma agregada, como as pessoas chegam ao Sou Bilíngue.</li>
      </ul>

      <h2>Com quem compartilhamos</h2>
      <ul>
        <li>Supabase (banco de dados e autenticação).</li>
        <li>Anthropic (geração das respostas do professor virtual).</li>
        <li>ElevenLabs (transcrição da sua voz e voz do professor, conforme o plano).</li>
        <li>Asaas (pagamentos).</li>
        <li>Servidor de hospedagem da aplicação.</li>
      </ul>
      <p>Não vendemos seus dados.</p>

      <h2>Crianças e adolescentes</h2>
      <p>
        O uso por menores de 18 anos depende do consentimento do responsável legal, conforme o artigo 14 da LGPD. O
        responsável acompanha o progresso do aluno em uma área própria.
      </p>

      <h2>Seus direitos</h2>
      <p>
        Você pode pedir acesso, correção, portabilidade ou exclusão dos seus dados, e revogar consentimentos, pelos contatos
        de suporte informados na página inicial. As preferências de aula podem ser editadas a qualquer momento no seu perfil.
        Registros financeiros podem ser mantidos pelo prazo exigido em lei.
      </p>

      <h2>Segurança</h2>
      <p>
        Cada aluno acessa apenas os próprios dados (controle de acesso no banco de dados), chaves de serviços ficam só no
        servidor e as conexões são criptografadas (HTTPS).
      </p>
    </PaginaLegal>
  );
}
