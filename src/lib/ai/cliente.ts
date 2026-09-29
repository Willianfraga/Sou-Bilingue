import Anthropic from "@anthropic-ai/sdk";

// Cliente da Anthropic usado pela aula e pelo assistente de vendas. A chave
// vem de ANTHROPIC_API_KEY (só no servidor). Se a chave foi criada fora de
// um workspace, a API exige o ID do workspace: defina ANTHROPIC_WORKSPACE_ID
// (ex.: wrkspc_...; não é segredo). Sem ela, nada muda.

export function cabecalhosDaAnthropic(workspaceId = process.env.ANTHROPIC_WORKSPACE_ID): Record<string, string> {
  const id = workspaceId?.trim();
  return id && /^wrkspc_[A-Za-z0-9]+$/.test(id) ? { "anthropic-workspace-id": id } : {};
}

export function criarClienteAnthropic(opcoes: { timeout?: number; maxRetries?: number } = {}) {
  return new Anthropic({ ...opcoes, defaultHeaders: cabecalhosDaAnthropic() });
}
