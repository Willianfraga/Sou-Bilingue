import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { NOME_DO_IDIOMA, NOME_DO_PLANO, type Certificado } from "@/lib/types";

// § 06/07: o certificado precisa existir como PDF de verdade, não só como
// linha no banco — mas o PDF é só a materialização; quem prova autenticidade
// é a página pública /verificar/[codigo], por isso o código de verificação e
// a URL de verificação vão impressos aqui.
const URL_BASE =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
  "https://soubilingue.com.br";

const AZUL_MARINHO = rgb(0.06, 0.11, 0.2); // mesma paleta escura usada no app
const DOURADO = rgb(0.72, 0.53, 0.04);
const CINZA = rgb(0.4, 0.4, 0.4);

export async function gerarCertificadoPdf(dados: {
  nomeAluno: string;
  certificado: Certificado;
}): Promise<Uint8Array> {
  const { nomeAluno, certificado } = dados;

  const doc = await PDFDocument.create();
  const pagina = doc.addPage([842, 595]); // A4 paisagem
  const { width, height } = pagina.getSize();

  const fonteTitulo = await doc.embedFont(StandardFonts.HelveticaBold);
  const fonteTexto = await doc.embedFont(StandardFonts.Helvetica);

  // moldura simples
  pagina.drawRectangle({
    x: 24,
    y: 24,
    width: width - 48,
    height: height - 48,
    borderColor: AZUL_MARINHO,
    borderWidth: 3,
  });
  pagina.drawRectangle({
    x: 34,
    y: 34,
    width: width - 68,
    height: height - 68,
    borderColor: DOURADO,
    borderWidth: 1,
  });

  const centralizarX = (texto: string, tamanho: number, fonte = fonteTexto) =>
    (width - fonte.widthOfTextAtSize(texto, tamanho)) / 2;

  pagina.drawText("SOUBILINGUE", {
    x: centralizarX("SOUBILINGUE", 16, fonteTitulo),
    y: height - 90,
    size: 16,
    font: fonteTitulo,
    color: DOURADO,
  });

  const titulo = "Certificado de Conclusão Mensal";
  pagina.drawText(titulo, {
    x: centralizarX(titulo, 30, fonteTitulo),
    y: height - 150,
    size: 30,
    font: fonteTitulo,
    color: AZUL_MARINHO,
  });

  const linha1 = "Certificamos que";
  pagina.drawText(linha1, {
    x: centralizarX(linha1, 14),
    y: height - 220,
    size: 14,
    font: fonteTexto,
    color: CINZA,
  });

  pagina.drawText(nomeAluno, {
    x: centralizarX(nomeAluno, 26, fonteTitulo),
    y: height - 260,
    size: 26,
    font: fonteTitulo,
    color: AZUL_MARINHO,
  });

  const idioma = NOME_DO_IDIOMA[certificado.idioma];
  const plano = NOME_DO_PLANO[certificado.plano];
  const linha2 = `cumpriu integralmente a cota de aulas de ${idioma} do plano ${plano}`;
  pagina.drawText(linha2, {
    x: centralizarX(linha2, 14),
    y: height - 300,
    size: 14,
    font: fonteTexto,
    color: CINZA,
  });

  const linha3 = `em todas as semanas de ${certificado.mesReferencia}.`;
  pagina.drawText(linha3, {
    x: centralizarX(linha3, 14),
    y: height - 322,
    size: 14,
    font: fonteTexto,
    color: CINZA,
  });

  const urlVerificacao = `${URL_BASE}/verificar/${certificado.codigoVerificacao}`;

  pagina.drawText(`Código de verificação: ${certificado.codigoVerificacao}`, {
    x: centralizarX(
      `Código de verificação: ${certificado.codigoVerificacao}`,
      11,
    ),
    y: 110,
    size: 11,
    font: fonteTexto,
    color: AZUL_MARINHO,
  });

  pagina.drawText(`Verifique em ${urlVerificacao}`, {
    x: centralizarX(`Verifique em ${urlVerificacao}`, 10),
    y: 92,
    size: 10,
    font: fonteTexto,
    color: CINZA,
  });

  pagina.drawText(`Emitido em ${certificado.emitidoEm}`, {
    x: centralizarX(`Emitido em ${certificado.emitidoEm}`, 10),
    y: 74,
    size: 10,
    font: fonteTexto,
    color: CINZA,
  });

  doc.setTitle(`Certificado SouBilingue — ${nomeAluno} — ${certificado.mesReferencia}`);
  doc.setSubject("Certificado de conclusão mensal");
  doc.setProducer("SouBilingue");

  return doc.save();
}

// § 07: portfólio único — todos os certificados do aluno num PDF só, na ordem
// em que já vêm da consulta (mais recente primeiro).
export async function gerarPortfolioPdf(dados: {
  nomeAluno: string;
  certificados: Certificado[];
}): Promise<Uint8Array> {
  const portfolio = await PDFDocument.create();

  for (const certificado of dados.certificados) {
    const bytesDoCertificado = await gerarCertificadoPdf({
      nomeAluno: dados.nomeAluno,
      certificado,
    });
    const docDoCertificado = await PDFDocument.load(bytesDoCertificado);
    const [pagina] = await portfolio.copyPages(docDoCertificado, [0]);
    portfolio.addPage(pagina);
  }

  portfolio.setTitle(`Portfólio de certificados — ${dados.nomeAluno}`);
  portfolio.setProducer("SouBilingue");

  return portfolio.save();
}
