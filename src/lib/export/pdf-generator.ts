import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface PDFOptions {
  titulo: string;
  nomeAluno: string;
  periodo: string;
}

/**
 * Gera PDF a partir de um elemento HTML
 */
export async function gerarPDFDoElemento(
  elementoId: string,
  opcoes: PDFOptions
): Promise<void> {
  try {
    const elemento = document.getElementById(elementoId);
    if (!elemento) {
      throw new Error("Elemento não encontrado");
    }

    // Converter elemento HTML para canvas
    const canvas = await html2canvas(elemento, {
      scale: 2,
      backgroundColor: "#ffffff",
    });

    // Criar PDF com dimensions do canvas
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const imgData = canvas.toDataURL("image/png");
    const imgWidth = 210 - 20; // A4 width - margins
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    pdf.addImage(imgData, "PNG", 10, 10, imgWidth, imgHeight);

    // Adicionar header
    pdf.setFontSize(12);
    pdf.text(opcoes.titulo, 10, 280);
    pdf.setFontSize(10);
    pdf.text(`Aluno: ${opcoes.nomeAluno}`, 10, 286);
    pdf.text(`Período: ${opcoes.periodo}`, 10, 292);

    pdf.save(`${opcoes.titulo}-${new Date().toISOString().split("T")[0]}.pdf`);
  } catch (error) {
    console.error("Erro ao gerar PDF:", error);
    throw error;
  }
}

/**
 * Gera PDF customizado de relatório
 */
export function gerarPDFRelatorio(
  nomeAluno: string,
  periodo: string,
  dados: {
    horas_total: number;
    horas_usadas: number;
    horas_restantes: number;
    percentual_usado: number;
    sessoes_total: number;
    duracao_media: number;
    data_geracao: string;
  }
): void {
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  // Cores
  const corPrimaria = [59, 130, 246]; // blue-500
  const corTexto = [23, 23, 23]; // neutral-900

  // Header
  pdf.setFillColor(corPrimaria[0], corPrimaria[1], corPrimaria[2]);
  pdf.rect(0, 0, 210, 40, "F");

  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(24);
  pdf.text("Relatório de Consumo", 105, 20, { align: "center" });
  pdf.setFontSize(12);
  pdf.text(`Sou Bilingue`, 105, 30, { align: "center" });

  // Informações do aluno
  pdf.setTextColor(corTexto[0], corTexto[1], corTexto[2]);
  pdf.setFontSize(10);
  pdf.text(`Aluno: ${nomeAluno}`, 20, 55);
  pdf.text(`Período: ${periodo}`, 20, 62);
  pdf.text(`Gerado em: ${dados.data_geracao}`, 20, 69);

  // Seção de Resumo
  pdf.setFontSize(14);
  pdf.setTextColor(corPrimaria[0], corPrimaria[1], corPrimaria[2]);
  pdf.text("Resumo", 20, 85);

  pdf.setTextColor(corTexto[0], corTexto[1], corTexto[2]);
  pdf.setFontSize(11);

  const resumoY = 95;
  const linhaAltura = 7;

  pdf.text(`Horas Totais: ${dados.horas_total}h`, 20, resumoY);
  pdf.text(`Horas Usadas: ${dados.horas_usadas}h`, 20, resumoY + linhaAltura);
  pdf.text(`Horas Restantes: ${dados.horas_restantes}h`, 20, resumoY + linhaAltura * 2);
  pdf.text(`Percentual Usado: ${dados.percentual_usado}%`, 20, resumoY + linhaAltura * 3);
  pdf.text(`Sessões Totais: ${dados.sessoes_total}`, 20, resumoY + linhaAltura * 4);
  pdf.text(`Duração Média: ${dados.duracao_media}min`, 20, resumoY + linhaAltura * 5);

  // Barra de progresso (simulada com retângulo)
  const progressoX = 20;
  const progressoY = resumoY + linhaAltura * 7;
  const progressoWidth = 170;
  const progressoHeight = 5;

  pdf.setDrawColor(200, 200, 200);
  pdf.rect(progressoX, progressoY, progressoWidth, progressoHeight);

  const progressoWidth_fill = (progressoWidth * dados.percentual_usado) / 100;
  pdf.setFillColor(corPrimaria[0], corPrimaria[1], corPrimaria[2]);
  pdf.rect(progressoX, progressoY, progressoWidth_fill, progressoHeight, "F");

  pdf.setTextColor(corTexto[0], corTexto[1], corTexto[2]);
  pdf.setFontSize(10);
  pdf.text(`${dados.percentual_usado}%`, progressoX + progressoWidth + 5, progressoY + 4);

  // Footer
  pdf.setFontSize(8);
  pdf.setTextColor(150, 150, 150);
  pdf.text(
    "Este é um relatório gerado automaticamente. Para detalhes completos, acesse o dashboard.",
    105,
    280,
    { align: "center" }
  );

  pdf.save(`Relatorio-${nomeAluno}-${new Date().toISOString().split("T")[0]}.pdf`);
}

/**
 * Simples PDF de tabela
 */
export function gerarPDFTabela(
  titulo: string,
  nomeAluno: string,
  headers: string[],
  rows: string[][]
): void {
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const corPrimaria = [59, 130, 246];
  const corTexto = [23, 23, 23];

  // Header
  pdf.setFillColor(corPrimaria[0], corPrimaria[1], corPrimaria[2]);
  pdf.rect(0, 0, 210, 30, "F");

  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(16);
  pdf.text(titulo, 105, 18, { align: "center" });

  // Info
  pdf.setTextColor(corTexto[0], corTexto[1], corTexto[2]);
  pdf.setFontSize(10);
  pdf.text(`Aluno: ${nomeAluno}`, 20, 45);
  pdf.text(`Data: ${new Date().toLocaleDateString("pt-BR")}`, 20, 52);

  // Tabela
  let y = 65;
  const colWidth = 170 / headers.length;
  const linhaAltura = 7;

  // Headers
  pdf.setFillColor(230, 230, 230);
  pdf.setTextColor(corTexto[0], corTexto[1], corTexto[2]);
  pdf.setFontSize(10);

  headers.forEach((header, i) => {
    pdf.text(header, 20 + i * colWidth, y, { maxWidth: colWidth - 2 });
  });

  y += linhaAltura;

  // Dados
  pdf.setFillColor(255, 255, 255);
  rows.forEach((row) => {
    if (y > 270) {
      // Nova página se necessário
      pdf.addPage();
      y = 20;
    }

    row.forEach((cell, i) => {
      pdf.text(String(cell), 20 + i * colWidth, y, { maxWidth: colWidth - 2 });
    });

    y += linhaAltura;
  });

  pdf.save(`${titulo}-${new Date().toISOString().split("T")[0]}.pdf`);
}
