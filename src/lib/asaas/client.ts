/**
 * Cliente Asaas para integração com gateway de pagamento
 * Sandbox: https://sandbox.asaas.com/api/v3
 * Produção: https://api.asaas.com/v3
 */

const API_KEY = process.env.ASAAS_API_KEY;
const API_URL = process.env.ASAAS_API_URL;

// Validação lazy — só ocorre quando uma função é chamada, não na importação
function validateConfig() {
  if (!API_KEY || !API_URL) {
    throw new Error("ASAAS_API_KEY e ASAAS_API_URL não configuradas");
  }
}

// ============================================================================
// Tipos
// ============================================================================

export interface AsaasCustomer {
  id: string;
  name: string;
  email: string;
  cpfCnpj?: string;
  phone?: string;
}

export interface AsaasSubscription {
  id: string;
  customerId: string;
  billingType: "CREDIT_CARD" | "PIX" | "BOLETO";
  nextDueDate: string;
  status: "ACTIVE" | "PAUSED" | "CANCELLED" | "EXPIRED";
  discount?: {
    type: "FIXED" | "PERCENTAGE";
    value: number;
  };
  value: number;
  cycle: "MONTHLY" | "QUARTERLY" | "ANNUAL";
  maxPaymentAttempts?: number;
  description?: string;
}

export interface AsaasPayment {
  id: string;
  status:
    | "PENDING"
    | "CONFIRMED"
    | "RECEIVED"
    | "OVERDUE"
    | "REFUNDED"
    | "DECLINED"
    | "DUNNING_RECEIPT"
    | "DUNNING_REQUESTED"
    | "AWAITING_RISK_ANALYSIS";
  value: number;
  expectedDueDate: string;
  confirmationDate?: string;
  billingType: "CREDIT_CARD" | "PIX" | "BOLETO" | "DEBIT_ACCOUNT";
}

// ============================================================================
// Requisições HTTP
// ============================================================================

async function request<T>(
  method: "GET" | "POST" | "PUT" | "DELETE",
  endpoint: string,
  body?: Record<string, any>
): Promise<T> {
  validateConfig();
  const url = `${API_URL}${endpoint}`;
  const headers: Record<string, string> = {
    "accept": "application/json",
    "content-type": "application/json",
    "access_token": API_KEY || "",
  };

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Asaas error: ${JSON.stringify(error)}`);
  }

  return response.json();
}

// ============================================================================
// Clientes (Customers)
// ============================================================================

export async function createCustomer(data: {
  name: string;
  email: string;
  cpfCnpj?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
}): Promise<AsaasCustomer> {
  return request<AsaasCustomer>("POST", "/customers", {
    name: data.name,
    email: data.email,
    cpfCnpj: data.cpfCnpj,
    phone: data.phone,
    address: data.address,
    city: data.city,
    state: data.state,
    postalCode: data.postalCode,
  });
}

export async function getCustomer(customerId: string): Promise<AsaasCustomer> {
  return request<AsaasCustomer>("GET", `/customers/${customerId}`);
}

// ============================================================================
// Assinaturas (Subscriptions)
// ============================================================================

export async function createSubscription(data: {
  customerId: string;
  billingType: "CREDIT_CARD" | "PIX" | "BOLETO";
  value: number;
  nextDueDate: string; // YYYY-MM-DD
  cycle: "MONTHLY" | "QUARTERLY" | "ANNUAL";
  description?: string;
  maxPaymentAttempts?: number;
  discount?: {
    type: "FIXED" | "PERCENTAGE";
    value: number;
  };
}): Promise<AsaasSubscription> {
  return request<AsaasSubscription>("POST", "/subscriptions", data);
}

export async function getSubscription(
  subscriptionId: string
): Promise<AsaasSubscription> {
  return request<AsaasSubscription>(
    "GET",
    `/subscriptions/${subscriptionId}`
  );
}

export async function updateSubscription(
  subscriptionId: string,
  data: Partial<AsaasSubscription>
): Promise<AsaasSubscription> {
  return request<AsaasSubscription>(
    "PUT",
    `/subscriptions/${subscriptionId}`,
    data as Record<string, any>
  );
}

export async function pauseSubscription(
  subscriptionId: string
): Promise<AsaasSubscription> {
  return updateSubscription(subscriptionId, { status: "PAUSED" });
}

export async function resumeSubscription(
  subscriptionId: string
): Promise<AsaasSubscription> {
  return updateSubscription(subscriptionId, { status: "ACTIVE" });
}

export async function cancelSubscription(
  subscriptionId: string
): Promise<AsaasSubscription> {
  return updateSubscription(subscriptionId, { status: "CANCELLED" });
}

// ============================================================================
// Pagamentos (Payments)
// ============================================================================

export async function getPayment(paymentId: string): Promise<AsaasPayment> {
  return request<AsaasPayment>("GET", `/payments/${paymentId}`);
}

export async function getPayments(filters?: {
  customerId?: string;
  status?: string;
}): Promise<{ data: AsaasPayment[] }> {
  let endpoint = "/payments?";
  if (filters?.customerId) {
    endpoint += `customerId=${filters.customerId}&`;
  }
  if (filters?.status) {
    endpoint += `status=${filters.status}&`;
  }

  return request<{ data: AsaasPayment[] }>("GET", endpoint);
}

// ============================================================================
// Webhooks - Validação
// ============================================================================

export function validateWebhookSignature(
  body: string,
  signature: string | undefined
): boolean {
  if (!signature) return false;

  const webhookToken = process.env.ASAAS_WEBHOOK_TOKEN;
  if (!webhookToken) return false;

  // Asaas usa HMAC SHA-256
  const crypto = require("crypto");
  const hash = crypto
    .createHmac("sha256", webhookToken)
    .update(body)
    .digest("hex");

  return hash === signature;
}

// ============================================================================
// Checkout Link (PRÉ-APROVADO)
// ============================================================================

export function generateCheckoutLink(
  subscriptionId: string,
  redirectUrl?: string
): string {
  validateConfig();
  const baseUrl = (API_URL || "").replace("/api/v3", "");
  const url = new URL(`/checkout/${subscriptionId}`, baseUrl);

  if (redirectUrl) {
    url.searchParams.set("returnUrl", redirectUrl);
  }

  return url.toString();
}
