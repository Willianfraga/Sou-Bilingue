import type { Certificado } from "@/lib/types";

// Dado fixo — sem banco por trás ainda. Formato já pensado pra bater com a
// tabela real (docs/ESCOPO.md § 05, § 12: cada certificado carrega um código de
// verificação público, conferível em /verificar/[codigo]).
export function getCertificadosMock(): Certificado[] {
  return [
    {
      id: "cert-2026-07",
      mesReferencia: "Julho 2026",
      idioma: "espanhol",
      plano: "intermediario",
      codigoVerificacao: "SB-2026-07-K3F9Q",
      emitidoEm: "2026-08-01",
    },
    {
      id: "cert-2026-06",
      mesReferencia: "Junho 2026",
      idioma: "espanhol",
      plano: "intermediario",
      codigoVerificacao: "SB-2026-06-M7X2L",
      emitidoEm: "2026-07-01",
    },
  ];
}
