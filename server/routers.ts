import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { geocodePostalCode, optimizeRouteByProximity } from "./_core/routePlanner";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, publicProcedure, protectedProcedure, router, superadminProcedure } from "./_core/trpc";
import { ForbiddenError } from "@shared/_core/errors";
import {
  bulkDeleteDeliveries,
  bulkRescheduleDeliveries,
  createClientBase,
  createClientRecord,
  createDelivery,
  createDriver,
  createDriverVehicle,
  createTenantRecord,
  getClientBaseById,
  getClientById,
  deleteClientBase,
  deleteClientRecord,
  deleteDelivery,
  deleteDriver,
  deleteDriverVehicle,
  deleteTenantRecord,
  deleteUserAccount,
  getClientBases,
  getClients,
  getDeliveries,
  getDeliveryById,
  getDriverById,
  getDriverByUserId,
  getDriverVehicles,
  getDrivers,
  getTenantById,
  getTenants,
  getUserById,
  getUserByOpenId,
  getUsers,
  getDriverVehicleById,
  reorderDeliveries,
  upsertUser,
  updateClientBase,
  updateClientRecord,
  updateDelivery,
  updateDriver,
  updateDriverVehicle,
  updateTenantRecord,
  updateUser,
} from "./db";
import { z } from "zod";

const addressSchema = z.object({
  postalCode: z.string().optional().nullable(),
  street: z.string().optional().nullable(),
  number: z.string().optional().nullable(),
  neighborhood: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  complement: z.string().optional().nullable(),
  reference: z.string().optional().nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
});

function formatAddress(data: z.infer<typeof addressSchema>) {
  return [data.street, data.number, data.neighborhood, data.city, data.state].filter(Boolean).join(" - ");
}

function scopeTenantId(user: { role: string; tenantId: string | null }) {
  return user.role === "superadmin" ? undefined : user.tenantId ?? undefined;
}

function ensureTenantAccess(
  user: { role: string; tenantId: string | null },
  resourceTenantId: string | null | undefined
) {
  if (user.role === "superadmin") return;
  if (!user.tenantId || resourceTenantId !== user.tenantId) {
    throw ForbiddenError("You do not have required permission (10002)");
  }
}

function slugifyText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

async function ensureMotoristDriver(userId: string, tenantId: string) {
  const driver = await getDriverByUserId(userId);
  if (driver) return driver;
  return null;
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  saas: router({
    tenants: router({
      list: superadminProcedure.query(async () => getTenants()),
      create: superadminProcedure
        .input(
          z.object({
            name: z.string(),
            slug: z.string().optional(),
            contactName: z.string().optional().nullable(),
            contactEmail: z.string().email().optional().nullable(),
            contactPhone: z.string().optional().nullable(),
            status: z.enum(["active", "suspended"]).optional(),
            paymentStatus: z.enum(["ok", "pending", "overdue"]).optional(),
            paymentDueAt: z.date().optional().nullable(),
            notes: z.string().optional().nullable(),
          })
        )
        .mutation(async ({ input }) => {
          await createTenantRecord({
            ...input,
            slug:
              input.slug ||
              slugifyText(input.name),
          });
          return { success: true };
        }),
      update: superadminProcedure
        .input(
          z.object({
            id: z.string(),
            name: z.string().optional(),
            slug: z.string().optional(),
            contactName: z.string().optional().nullable(),
            contactEmail: z.string().email().optional().nullable(),
            contactPhone: z.string().optional().nullable(),
            status: z.enum(["active", "suspended"]).optional(),
            paymentStatus: z.enum(["ok", "pending", "overdue"]).optional(),
            paymentDueAt: z.date().optional().nullable(),
            notes: z.string().optional().nullable(),
          })
        )
        .mutation(async ({ input }) => {
          const { id, ...updates } = input;
          await updateTenantRecord(id, updates);
          return { success: true };
        }),
      delete: superadminProcedure.input(z.string()).mutation(async ({ input }) => {
        await deleteTenantRecord(input);
        return { success: true };
      }),
    }),
    users: router({
      list: superadminProcedure.query(async () => getUsers()),
    }),
  }),

  users: router({
    list: adminProcedure.query(async ({ ctx }) => getUsers(scopeTenantId(ctx.user))),
    create: adminProcedure
      .input(
        z.object({
          openId: z.string(),
          authUserId: z.string().uuid().optional().nullable(),
          tenantId: z.string().optional().nullable(),
          name: z.string().optional().nullable(),
          email: z.string().email().optional().nullable(),
          loginMethod: z.string().optional().nullable(),
          role: z.enum(["superadmin", "admin", "motorista"]).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await upsertUser({
          openId: input.openId,
          authUserId: input.authUserId ?? null,
          tenantId: ctx.user.role === "superadmin" ? input.tenantId ?? null : ctx.user.tenantId,
          name: input.name ?? null,
          email: input.email ?? null,
          loginMethod: input.loginMethod ?? null,
          role: input.role,
        });
        return { success: true };
      }),
    update: adminProcedure
      .input(
        z.object({
          id: z.string(),
          tenantId: z.string().optional().nullable(),
          name: z.string().optional().nullable(),
          email: z.string().email().optional().nullable(),
          loginMethod: z.string().optional().nullable(),
          role: z.enum(["superadmin", "admin", "motorista"]).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { id, tenantId, ...updates } = input;
        const current = await getUserById(id);
        if (current) {
          ensureTenantAccess(ctx.user, current.tenantId);
        }
        await updateUser(id, {
          ...updates,
          tenantId: ctx.user.role === "superadmin" ? tenantId ?? undefined : ctx.user.tenantId,
        });
        return { success: true };
      }),
    delete: adminProcedure.input(z.string()).mutation(async ({ ctx, input }) => {
      const current = await getUserById(input);
      if (current) {
        ensureTenantAccess(ctx.user, current.tenantId);
      }
      await deleteUserAccount(input);
      return { success: true };
    }),
  }),

  clients: router({
    list: protectedProcedure.query(async ({ ctx }) => getClients(scopeTenantId(ctx.user))),
    create: adminProcedure
      .input(
        z.object({
          name: z.string(),
          document: z.string().optional().nullable(),
          email: z.string().email().optional().nullable(),
          phone: z.string().optional().nullable(),
          notes: z.string().optional().nullable(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await createClientRecord({
          ...input,
          tenantId: ctx.user.tenantId!,
        });
        return { success: true };
      }),
    update: adminProcedure
      .input(
        z.object({
          id: z.string(),
          name: z.string().optional(),
          document: z.string().optional().nullable(),
          email: z.string().email().optional().nullable(),
          phone: z.string().optional().nullable(),
          notes: z.string().optional().nullable(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { id, ...updates } = input;
        const current = await getClientById(id);
        if (current) {
          ensureTenantAccess(ctx.user, current.tenantId);
        }
        await updateClientRecord(id, updates);
        return { success: true };
      }),
    delete: adminProcedure.input(z.string()).mutation(async ({ ctx, input }) => {
      const current = await getClientById(input);
      if (current) {
        ensureTenantAccess(ctx.user, current.tenantId);
      }
      await deleteClientRecord(input);
      return { success: true };
    }),
  }),

  clientBases: router({
    list: protectedProcedure
      .input(z.object({ clientId: z.string().optional() }).optional())
      .query(async ({ ctx, input }) => getClientBases(scopeTenantId(ctx.user), input?.clientId)),
    create: adminProcedure
      .input(
        z.object({
          clientId: z.string(),
          name: z.string(),
          isDefault: z.boolean().optional(),
          postalCode: z.string().optional().nullable(),
          street: z.string().optional().nullable(),
          number: z.string().optional().nullable(),
          neighborhood: z.string().optional().nullable(),
          city: z.string().optional().nullable(),
          state: z.string().optional().nullable(),
          complement: z.string().optional().nullable(),
          reference: z.string().optional().nullable(),
          latitude: z.number().optional().nullable(),
          longitude: z.number().optional().nullable(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await createClientBase({
          ...input,
          tenantId: ctx.user.tenantId!,
        });
        return { success: true };
      }),
    update: adminProcedure
      .input(
        z.object({
          id: z.string(),
          clientId: z.string().optional(),
          name: z.string().optional(),
          isDefault: z.boolean().optional(),
          postalCode: z.string().optional().nullable(),
          street: z.string().optional().nullable(),
          number: z.string().optional().nullable(),
          neighborhood: z.string().optional().nullable(),
          city: z.string().optional().nullable(),
          state: z.string().optional().nullable(),
          complement: z.string().optional().nullable(),
          reference: z.string().optional().nullable(),
          latitude: z.number().optional().nullable(),
          longitude: z.number().optional().nullable(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { id, ...updates } = input;
        const current = await getClientBaseById(id);
        if (current) {
          ensureTenantAccess(ctx.user, current.tenantId);
        }
        await updateClientBase(id, updates);
        return { success: true };
      }),
    delete: adminProcedure.input(z.string()).mutation(async ({ ctx, input }) => {
      const current = await getClientBaseById(input);
      if (current) {
        ensureTenantAccess(ctx.user, current.tenantId);
      }
      await deleteClientBase(input);
      return { success: true };
    }),
  }),

  drivers: router({
    list: protectedProcedure.query(async ({ ctx }) => getDrivers(scopeTenantId(ctx.user))),
    me: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "motorista") return null;
      if (!ctx.user.id) return null;
      return getDriverByUserId(ctx.user.id);
    }),
    getById: protectedProcedure.input(z.string()).query(async ({ input }) => getDriverById(input)),
    create: adminProcedure
      .input(
        z.object({
          userId: z.string().optional().nullable(),
          name: z.string(),
          email: z.string().email().optional().nullable(),
          phone: z.string().optional().nullable(),
          status: z.enum(["available", "busy", "offline"]).optional(),
          notes: z.string().optional().nullable(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await createDriver({
          ...input,
          tenantId: ctx.user.tenantId!,
        });
        return { success: true };
      }),
    update: adminProcedure
      .input(
        z.object({
          id: z.string(),
          userId: z.string().optional().nullable(),
          name: z.string().optional(),
          email: z.string().email().optional().nullable(),
          phone: z.string().optional().nullable(),
          status: z.enum(["available", "busy", "offline"]).optional(),
          notes: z.string().optional().nullable(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { id, ...updates } = input;
        const current = await getDriverById(id);
        if (current) {
          ensureTenantAccess(ctx.user, current.tenantId);
        }
        await updateDriver(id, updates);
        return { success: true };
      }),
    delete: adminProcedure.input(z.string()).mutation(async ({ ctx, input }) => {
      const current = await getDriverById(input);
      if (current) {
        ensureTenantAccess(ctx.user, current.tenantId);
      }
      await deleteDriver(input);
      return { success: true };
    }),
  }),

  driverVehicles: router({
    list: protectedProcedure
      .input(z.object({ driverId: z.string().optional() }).optional())
      .query(async ({ ctx, input }) => getDriverVehicles(scopeTenantId(ctx.user), input?.driverId)),
    create: adminProcedure
      .input(
        z.object({
          driverId: z.string(),
          model: z.string(),
          plate: z.string(),
          nickname: z.string().optional().nullable(),
          isPrimary: z.boolean().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await createDriverVehicle({
          ...input,
          tenantId: ctx.user.tenantId!,
        });
        return { success: true };
      }),
    update: adminProcedure
      .input(
        z.object({
          id: z.string(),
          driverId: z.string().optional(),
          model: z.string().optional(),
          plate: z.string().optional(),
          nickname: z.string().optional().nullable(),
          isPrimary: z.boolean().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { id, ...updates } = input;
        const current = await getDriverVehicleById(id);
        if (current) {
          ensureTenantAccess(ctx.user, current.tenantId);
        }
        await updateDriverVehicle(id, updates);
        return { success: true };
      }),
    delete: adminProcedure.input(z.string()).mutation(async ({ ctx, input }) => {
      const current = await getDriverVehicleById(input);
      if (current) {
        ensureTenantAccess(ctx.user, current.tenantId);
      }
      await deleteDriverVehicle(input);
      return { success: true };
    }),
  }),

  deliveries: router({
    list: protectedProcedure
      .input(
        z
          .object({
            status: z.string().optional(),
            driverId: z.string().optional(),
            clientId: z.string().optional(),
            baseId: z.string().optional(),
            startDate: z.date().optional(),
            endDate: z.date().optional(),
            onlyUncompleted: z.boolean().optional(),
          })
          .optional()
      )
      .query(async ({ ctx, input }) => {
        const tenantId = scopeTenantId(ctx.user);
        const driverId = ctx.user.role === "motorista" ? (await getDriverByUserId(ctx.user.id!))?.id ?? undefined : input?.driverId;
        return getDeliveries({
          tenantId,
          status: input?.status,
          driverId,
          clientId: input?.clientId,
          baseId: input?.baseId,
          startDate: input?.startDate,
          endDate: input?.endDate,
          onlyUncompleted: input?.onlyUncompleted,
        });
      }),
    getById: protectedProcedure.input(z.string()).query(async ({ input }) => getDeliveryById(input)),
    create: adminProcedure
      .input(
        z.object({
          clientId: z.string().optional().nullable(),
          clientName: z.string(),
          baseId: z.string().optional().nullable(),
          originPostalCode: z.string().optional().nullable(),
          originStreet: z.string().optional().nullable(),
          originNumber: z.string().optional().nullable(),
          originNeighborhood: z.string().optional().nullable(),
          originCity: z.string().optional().nullable(),
          originState: z.string().optional().nullable(),
          originComplement: z.string().optional().nullable(),
          originReference: z.string().optional().nullable(),
          originLatitude: z.number().optional().nullable(),
          originLongitude: z.number().optional().nullable(),
          originAddress: z.string().optional(),
          destinationPostalCode: z.string().optional().nullable(),
          destinationStreet: z.string().optional().nullable(),
          destinationNumber: z.string().optional().nullable(),
          destinationNeighborhood: z.string().optional().nullable(),
          destinationCity: z.string().optional().nullable(),
          destinationState: z.string().optional().nullable(),
          destinationComplement: z.string().optional().nullable(),
          destinationReference: z.string().optional().nullable(),
          destinationLatitude: z.number().optional().nullable(),
          destinationLongitude: z.number().optional().nullable(),
          destinationAddress: z.string().optional(),
          driverId: z.string().optional().nullable(),
          scheduledAt: z.date().optional(),
          notes: z.string().optional().nullable(),
          distance: z.string().optional().nullable(),
          estimatedTime: z.string().optional().nullable(),
          routeOrder: z.number().optional().nullable(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const payload = {
          ...input,
          tenantId: ctx.user.tenantId!,
          originAddress:
            input.originAddress ??
            formatAddress({
              postalCode: input.originPostalCode,
              street: input.originStreet,
              number: input.originNumber,
              neighborhood: input.originNeighborhood,
              city: input.originCity,
              state: input.originState,
              complement: input.originComplement,
              reference: input.originReference,
              latitude: input.originLatitude,
              longitude: input.originLongitude,
            }),
          destinationAddress:
            input.destinationAddress ??
            formatAddress({
              postalCode: input.destinationPostalCode,
              street: input.destinationStreet,
              number: input.destinationNumber,
              neighborhood: input.destinationNeighborhood,
              city: input.destinationCity,
              state: input.destinationState,
              complement: input.destinationComplement,
              reference: input.destinationReference,
              latitude: input.destinationLatitude,
              longitude: input.destinationLongitude,
            }),
        };

        await createDelivery(payload as any);
        return { success: true };
      }),
    update: protectedProcedure
      .input(
        z.object({
          id: z.string(),
          clientId: z.string().optional().nullable(),
          clientName: z.string().optional(),
          baseId: z.string().optional().nullable(),
          originPostalCode: z.string().optional().nullable(),
          originStreet: z.string().optional().nullable(),
          originNumber: z.string().optional().nullable(),
          originNeighborhood: z.string().optional().nullable(),
          originCity: z.string().optional().nullable(),
          originState: z.string().optional().nullable(),
          originComplement: z.string().optional().nullable(),
          originReference: z.string().optional().nullable(),
          originLatitude: z.number().optional().nullable(),
          originLongitude: z.number().optional().nullable(),
          originAddress: z.string().optional(),
          destinationPostalCode: z.string().optional().nullable(),
          destinationStreet: z.string().optional().nullable(),
          destinationNumber: z.string().optional().nullable(),
          destinationNeighborhood: z.string().optional().nullable(),
          destinationCity: z.string().optional().nullable(),
          destinationState: z.string().optional().nullable(),
          destinationComplement: z.string().optional().nullable(),
          destinationReference: z.string().optional().nullable(),
          destinationLatitude: z.number().optional().nullable(),
          destinationLongitude: z.number().optional().nullable(),
          destinationAddress: z.string().optional(),
          status: z.enum(["pendente", "em_rota", "entregue", "cancelado"]).optional(),
          driverId: z.string().optional().nullable(),
          scheduledAt: z.date().optional().nullable(),
          notes: z.string().optional().nullable(),
          distance: z.string().optional().nullable(),
          estimatedTime: z.string().optional().nullable(),
          routeOrder: z.number().optional().nullable(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { id, ...updates } = input;
        const current = await getDeliveryById(id);
        if (!current) return { success: true };
        if (ctx.user.role === "motorista") {
          const driver = await getDriverByUserId(ctx.user.id!);
          if (!driver || current.driverId !== driver.id) {
            return { success: false };
          }
          await updateDelivery(id, { status: updates.status, notes: updates.notes });
          return { success: true };
        }
        ensureTenantAccess(ctx.user, current.tenantId);
        await updateDelivery(id, updates as any);
        return { success: true };
      }),
    delete: adminProcedure.input(z.string()).mutation(async ({ ctx, input }) => {
      const current = await getDeliveryById(input);
      if (current) {
        ensureTenantAccess(ctx.user, current.tenantId);
      }
      await deleteDelivery(input);
      return { success: true };
    }),
    bulkDelete: adminProcedure.input(z.array(z.string())).mutation(async ({ input }) => {
      await bulkDeleteDeliveries(input);
      return { success: true };
    }),
    bulkReschedule: adminProcedure
      .input(
        z.object({
          ids: z.array(z.string()),
          scheduledAt: z.date().optional(),
          driverId: z.string().optional().nullable(),
        })
      )
      .mutation(async ({ input }) => {
        await bulkRescheduleDeliveries(input.ids, {
          scheduledAt: input.scheduledAt,
          driverId: input.driverId ?? null,
          routeOrder: null,
        });
        return { success: true };
      }),
    reorder: adminProcedure
      .input(
        z.object({
          updates: z.array(
            z.object({
              id: z.string(),
              routeOrder: z.number(),
              driverId: z.string().optional().nullable(),
              scheduledAt: z.date().optional().nullable(),
            })
          ),
        })
      )
      .mutation(async ({ input }) => {
        await reorderDeliveries(input.updates);
        return { success: true };
      }),
  }),

  routes: router({
    geocodeCep: protectedProcedure.input(z.string()).query(async ({ input }) => geocodePostalCode(input)),
    optimize: adminProcedure
      .input(
        z.object({
          driverId: z.string().optional(),
          baseAddress: z.string().optional(),
          baseLatitude: z.number().optional().nullable(),
          baseLongitude: z.number().optional().nullable(),
          scheduledAt: z.date().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const start = input.scheduledAt ? new Date(input.scheduledAt) : new Date();
        const dayStart = new Date(start);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(start);
        dayEnd.setHours(23, 59, 59, 999);

        const deliveries = await getDeliveries({
          tenantId: scopeTenantId(ctx.user),
          driverId: input.driverId,
          startDate: dayStart,
          endDate: dayEnd,
          onlyUncompleted: true,
        });

        const route = await optimizeRouteByProximity(
          deliveries.map(delivery => ({
            id: delivery.id,
            label: delivery.clientName,
            address: delivery.destinationAddress,
            latitude: delivery.destinationLatitude,
            longitude: delivery.destinationLongitude,
            order: delivery.routeOrder,
          })),
          input.baseLatitude != null && input.baseLongitude != null
            ? { latitude: input.baseLatitude, longitude: input.baseLongitude }
            : null
        );

        return {
          baseAddress: input.baseAddress ?? null,
          stops: route,
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;
