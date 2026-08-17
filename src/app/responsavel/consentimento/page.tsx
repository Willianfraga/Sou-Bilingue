import { PlaceholderScreen } from "@/components/PlaceholderScreen";

export default function ConsentimentoLgpd() {
  return (
    <PlaceholderScreen
      title="Consentimento LGPD"
      escopo="ESCOPO.md § 02"
      descricao="Consentimento do uso dos dados do menor (nome, progresso, certificados emitidos), exigido pelo Art. 14 da LGPD antes de liberar o cadastro. Sem isso, o cadastro do aluno menor não é ativado."
    />
  );
}
