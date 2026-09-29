// Categorias de custo do painel (Fase C). Módulo puro.
// "ia" = custos de inteligência artificial: o consumo já é estimado
// automaticamente; lançamentos nessas categorias são FATURAS (confirmado).

export type GrupoCusto = "Inteligência artificial" | "Infraestrutura" | "Comunicação" | "Operação" | "Impostos" | "Outros";

export type Categoria = { id: string; rotulo: string; grupo: GrupoCusto; tipoPadrao: "fixo" | "variavel"; ia?: true };

export const CATEGORIAS: Categoria[] = [
  { id: "modelos_linguagem", rotulo: "Modelos de linguagem", grupo: "Inteligência artificial", tipoPadrao: "variavel", ia: true },
  { id: "sintese_voz", rotulo: "Síntese de voz", grupo: "Inteligência artificial", tipoPadrao: "variavel", ia: true },
  { id: "transcricao", rotulo: "Transcrição de voz", grupo: "Inteligência artificial", tipoPadrao: "variavel", ia: true },
  { id: "traducao", rotulo: "Tradução", grupo: "Inteligência artificial", tipoPadrao: "variavel", ia: true },
  { id: "imagens", rotulo: "Geração de imagens", grupo: "Inteligência artificial", tipoPadrao: "variavel", ia: true },
  { id: "embeddings", rotulo: "Embeddings", grupo: "Inteligência artificial", tipoPadrao: "variavel", ia: true },
  { id: "banco_vetorial", rotulo: "Banco de dados vetorial", grupo: "Inteligência artificial", tipoPadrao: "fixo", ia: true },
  { id: "hospedagem", rotulo: "Hospedagem", grupo: "Infraestrutura", tipoPadrao: "fixo" },
  { id: "servidores", rotulo: "Servidores", grupo: "Infraestrutura", tipoPadrao: "fixo" },
  { id: "banco_dados", rotulo: "Banco de dados", grupo: "Infraestrutura", tipoPadrao: "fixo" },
  { id: "armazenamento", rotulo: "Armazenamento", grupo: "Infraestrutura", tipoPadrao: "variavel" },
  { id: "cdn", rotulo: "CDN", grupo: "Infraestrutura", tipoPadrao: "variavel" },
  { id: "dominios", rotulo: "Domínios", grupo: "Infraestrutura", tipoPadrao: "fixo" },
  { id: "autenticacao", rotulo: "Autenticação", grupo: "Infraestrutura", tipoPadrao: "fixo" },
  { id: "monitoramento", rotulo: "Monitoramento", grupo: "Infraestrutura", tipoPadrao: "fixo" },
  { id: "email", rotulo: "Envio de e-mails", grupo: "Comunicação", tipoPadrao: "variavel" },
  { id: "sms", rotulo: "SMS", grupo: "Comunicação", tipoPadrao: "variavel" },
  { id: "whatsapp", rotulo: "WhatsApp", grupo: "Comunicação", tipoPadrao: "variavel" },
  { id: "notificacoes", rotulo: "Notificações", grupo: "Comunicação", tipoPadrao: "variavel" },
  { id: "analytics", rotulo: "Analytics", grupo: "Operação", tipoPadrao: "fixo" },
  { id: "suporte", rotulo: "Suporte", grupo: "Operação", tipoPadrao: "fixo" },
  { id: "gateway_pagamento", rotulo: "Gateway de pagamento (manual)", grupo: "Operação", tipoPadrao: "variavel" },
  { id: "ferramentas_internas", rotulo: "Ferramentas internas", grupo: "Operação", tipoPadrao: "fixo" },
  { id: "servicos_contratados", rotulo: "Serviços contratados", grupo: "Operação", tipoPadrao: "fixo" },
  { id: "impostos", rotulo: "Impostos", grupo: "Impostos", tipoPadrao: "variavel" },
  { id: "outros", rotulo: "Outros", grupo: "Outros", tipoPadrao: "fixo" },
];

export const IDS_CATEGORIA = CATEGORIAS.map((c) => c.id);
export const categoriaPorId = (id: string) => CATEGORIAS.find((c) => c.id === id);
export const rotuloCategoria = (id: string) => (id === "total" ? "Total do mês" : categoriaPorId(id)?.rotulo ?? id);
export const ehCategoriaIa = (id: string) => Boolean(categoriaPorId(id)?.ia);
