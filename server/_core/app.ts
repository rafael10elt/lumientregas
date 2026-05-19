import express, { type Express } from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { z } from "zod";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { registerStorageProxy } from "./storageProxy";
import { createDelivery, getTenantById, getTenantBySlug } from "../db";

export function createApp(): Express {
  const app = express();

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  registerStorageProxy(app);

  const deliveryWebhookSchema = z.object({
    tenantId: z.string().uuid().optional(),
    tenantSlug: z.string().min(1).optional(),
    clientName: z.string().min(1),
    clientPhone: z.string().min(8),
    destinationPostalCode: z.string().optional().nullable(),
    destinationAddress: z.string().min(1),
    notes: z.string().optional().nullable(),
    baseId: z.string().uuid().optional().nullable(),
    originAddress: z.string().optional().nullable(),
    originPostalCode: z.string().optional().nullable(),
    scheduledAt: z.string().datetime().optional().nullable(),
    clientId: z.string().uuid().optional().nullable(),
    distance: z.string().optional().nullable(),
    estimatedTime: z.string().optional().nullable(),
  });

  app.post("/api/webhooks/deliveries", async (req, res) => {
    const webhookToken = process.env.N8N_DELIVERY_WEBHOOK_TOKEN;
    if (webhookToken) {
      const incomingToken = String(req.header("x-lumi-webhook-token") ?? "");
      if (incomingToken !== webhookToken) {
        return res.status(401).json({ success: false, message: "Invalid webhook token" });
      }
    }

    const parsed = deliveryWebhookSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid payload",
        issues: parsed.error.flatten(),
      });
    }

    const body = parsed.data;
    const tenant =
      (body.tenantId ? await getTenantById(body.tenantId) : null) ??
      (body.tenantSlug ? await getTenantBySlug(body.tenantSlug) : null);

    if (!tenant) {
      return res.status(404).json({ success: false, message: "Tenant not found" });
    }

    try {
      const delivery = await createDelivery(
        {
          tenantId: tenant.id,
          clientId: body.clientId ?? null,
          baseId: body.baseId ?? null,
          clientName: body.clientName,
          clientPhone: body.clientPhone,
          originPostalCode: body.originPostalCode ?? null,
          originAddress: body.originAddress ?? "",
          destinationPostalCode: body.destinationPostalCode ?? null,
          destinationAddress: body.destinationAddress,
          notes: body.notes ?? null,
          scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
          distance: body.distance ?? null,
          estimatedTime: body.estimatedTime ?? null,
          status: "pendente",
        },
        null
      );

      return res.status(201).json({ success: true, delivery });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error?.message ?? "Failed to create delivery",
      });
    }
  });

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  return app;
}
