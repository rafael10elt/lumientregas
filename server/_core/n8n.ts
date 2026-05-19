import { ENV } from "./env";

type N8nDeliveryRequestPayload = {
  tenant: {
    id: string;
    name: string;
    slug: string;
    contactName: string | null;
    contactEmail: string | null;
    contactPhone: string | null;
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

export async function forwardDeliveryRequestToN8n(payload: N8nDeliveryRequestPayload) {
  if (!ENV.n8nDeliveryWebhookUrl) {
    return { forwarded: false as const, error: null };
  }

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
