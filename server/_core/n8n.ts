// server/_core/n8n.ts
import { ENV } from "./env";

type N8nDeliveryRequestPayload = {
  tenant: {
    id: string;
    name: string;
    slug: string;
    contactName: string | null;  // Adicionado
    contactEmail: string | null; // Adicionado
    contactPhone: string | null; // Adicionado
  };
  delivery: {
    id: string;
    code: string;
    clientName: string;
    clientPhone: string;
    destinationAddress: string;
    destinationPostalCode: string | null;
    notes: string | null;
    scheduledAt: string | null;
    status: string;
  };
  request: Record<string, unknown>;
  submittedAt: string;
  source: "public-portal";
};

export async function forwardDeliveryRequestToN8n(
  // Adicionado o parâmetro 'tenant' para garantir que os dados estejam disponíveis
  tenant: { 
    id: string; 
    name: string; 
    slug: string; 
    contactName: string | null; 
    contactEmail: string | null; 
    contactPhone: string | null; 
  },
  delivery: any,
  request: Record<string, unknown>
) {
  if (!ENV.n8nDeliveryWebhookUrl) {
    return { forwarded: false as const, error: null };
  }

  const payload: N8nDeliveryRequestPayload = {
    tenant: {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      contactName: tenant.contactName,
      contactEmail: tenant.contactEmail,
      contactPhone: tenant.contactPhone,
    },
    delivery: {
      id: delivery.id,
      code: delivery.deliveryCode,
      clientName: delivery.clientName,
      clientPhone: delivery.clientPhone,
      destinationAddress: delivery.destinationAddress,
      destinationPostalCode: delivery.destinationPostalCode,
      notes: delivery.notes,
      scheduledAt: delivery.scheduledAt ? new Date(delivery.scheduledAt).toISOString() : null,
      status: delivery.status,
    },
    request,
    submittedAt: new Date().toISOString(),
    source: "public-portal",
  };

  try {
    const headers: Record<string, string> = {
      "content-type": "application/json",
    };

    if (ENV.n8nDeliveryWebhookToken) {
      headers["x-lumi-webhook-token"] = ENV.n8nDeliveryWebhookToken;
    }

    const response = await fetch(ENV.n8nDeliveryWebhookUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      return {
        forwarded: false as const,
        error: `N8N webhook returned ${response.status}${text ? `: ${text}` : ""}`,
      };
    }

    return { forwarded: true as const, error: null };
  } catch (error: any) {
    return {
      forwarded: false as const,
      error: error?.message ?? "Failed to forward delivery request to N8N",
    };
  }
}