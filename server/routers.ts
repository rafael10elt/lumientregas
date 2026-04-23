import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, publicProcedure, router, superadminProcedure, tenantProtectedProcedure } from "./_core/trpc";
import {
  createAuthUser,
  createDelivery,
  createDriverVehicle,
  deleteDelivery,
  createDriver,
  deleteDriverVehicle,
  deleteDriver,
  createTenant,
  getDeliveries,
  getDeliveryById,
  getDriverVehicles,
  getDrivers,
  getDriverById,
  getUsers,
  deleteUserAccount,
  deleteTenant,
  getTenants,
  updateDelivery,
  updateDriver,
  updateDeliveriesOrder,
  updateDriverVehicle,
  updateTenant,
  updateUser,
} from "./db";
import { geocodeAddress, optimizeByProximity } from "./_core/routePlanner";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => ({
      user: opts.ctx.user,
      tenant: opts.ctx.tenant ?? null,
      accessBlocked: opts.ctx.accessBlocked ?? false,
      accessBlockedReason: opts.ctx.accessBlockedReason ?? null,
    })),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  deliveries: router({
    list: tenantProtectedProcedure
      .input(
          z
          .object({
            status: z.string().optional(),
            driverId: z.coerce.string().optional(),
            startDate: z.date().optional(),
            endDate: z.date().optional(),
          })
          .optional()
      )
      .query(async ({ input, ctx }) => getDeliveries(input, ctx.accessToken)),

    getById: tenantProtectedProcedure
      .input(z.coerce.string())
      .query(async ({ input, ctx }) => getDeliveryById(input, ctx.accessToken)),

    create: tenantProtectedProcedure
      .input(
        z.object({
          clientName: z.string(),
          originPostalCode: z.string().optional(),
          originAddress: z.string(),
          originLat: z.string().optional(),
          originLng: z.string().optional(),
          destinationPostalCode: z.string().optional(),
          destinationAddress: z.string(),
          destinationLat: z.string().optional(),
          destinationLng: z.string().optional(),
          driverId: z.coerce.string().optional(),
          scheduledAt: z.date().optional(),
          notes: z.string().optional(),
          distance: z.string().optional(),
          estimatedTime: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        await createDelivery(
          {
            ...input,
            createdByUserId: ctx.user?.id ?? null,
          },
          ctx.accessToken
        );
        return { success: true };
      }),

    update: tenantProtectedProcedure
      .input(
        z.object({
          id: z.coerce.string(),
          status: z.enum(["pendente", "em_rota", "entregue", "cancelado"]).optional(),
          driverId: z.coerce.string().optional(),
          notes: z.string().optional(),
          originPostalCode: z.string().optional(),
          originAddress: z.string().optional(),
          destinationPostalCode: z.string().optional(),
          destinationAddress: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { id, ...updates } = input;
        await updateDelivery(id, updates, ctx.accessToken);
        return { success: true };
      }),

    delete: tenantProtectedProcedure
      .input(z.coerce.string())
      .mutation(async ({ input, ctx }) => {
        await deleteDelivery(input, ctx.accessToken);
        return { success: true };
      }),

    bulkDelete: tenantProtectedProcedure
      .input(z.array(z.coerce.string()))
      .mutation(async ({ input, ctx }) => {
        for (const id of input) {
          await deleteDelivery(id, ctx.accessToken);
        }
        return { success: true };
      }),

    bulkReschedule: tenantProtectedProcedure
      .input(
        z.object({
          ids: z.array(z.coerce.string()),
          scheduledAt: z.date(),
          driverId: z.coerce.string().optional(),
          status: z.enum(["pendente", "em_rota", "entregue", "cancelado"]).optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        for (const id of input.ids) {
          await updateDelivery(
            id,
            {
              scheduledAt: input.scheduledAt,
              driverId: input.driverId,
              status: input.status ?? "pendente",
              routeOrder: null,
            },
            ctx.accessToken
          );
        }
        return { success: true };
      }),

    reorder: tenantProtectedProcedure
      .input(
        z.object({
          driverId: z.coerce.string(),
          scheduledAt: z.date().optional(),
          order: z.array(z.object({ id: z.coerce.string(), routeOrder: z.number() })),
        })
      )
      .mutation(async ({ input, ctx }) => {
        await updateDeliveriesOrder(
          input.order.map(item => ({
            id: item.id,
            routeOrder: item.routeOrder,
            driverId: input.driverId,
            scheduledAt: input.scheduledAt,
          })),
          ctx.accessToken
        );
        return { success: true };
      }),
  }),

  drivers: router({
    list: tenantProtectedProcedure.query(async ({ ctx }) => getDrivers(ctx.accessToken)),

    getById: tenantProtectedProcedure
      .input(z.coerce.string())
      .query(async ({ input, ctx }) => getDriverById(input, ctx.accessToken)),

    create: tenantProtectedProcedure
      .input(
        z.object({
          name: z.string(),
          email: z.string().optional(),
          phone: z.string().optional(),
          vehicle: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        await createDriver(input, ctx.accessToken);
        return { success: true };
      }),

    update: tenantProtectedProcedure
      .input(
        z.object({
          id: z.coerce.string(),
          name: z.string().optional(),
          email: z.string().optional(),
          phone: z.string().optional(),
          vehicle: z.string().optional(),
          status: z.enum(["available", "busy", "offline"]).optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { id, ...updates } = input;
        await updateDriver(id, updates, ctx.accessToken);
        return { success: true };
      }),

    delete: tenantProtectedProcedure
      .input(z.coerce.string())
      .mutation(async ({ input, ctx }) => {
        await deleteDriver(input, ctx.accessToken);
        return { success: true };
      }),
  }),

  driverVehicles: router({
    list: tenantProtectedProcedure
      .input(z.object({ driverId: z.coerce.string().optional() }).optional())
      .query(async ({ input, ctx }) => getDriverVehicles(input?.driverId, ctx.accessToken)),

    create: tenantProtectedProcedure
      .input(
        z.object({
          driverId: z.coerce.string(),
          model: z.string(),
          plate: z.string(),
          nickname: z.string().optional(),
          isPrimary: z.boolean().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        await createDriverVehicle(input, ctx.accessToken);
        return { success: true };
      }),

    update: tenantProtectedProcedure
      .input(
        z.object({
          id: z.coerce.string(),
          model: z.string().optional(),
          plate: z.string().optional(),
          nickname: z.string().optional(),
          isPrimary: z.boolean().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { id, ...updates } = input;
        await updateDriverVehicle(id, updates, ctx.accessToken);
        return { success: true };
      }),

    delete: tenantProtectedProcedure
      .input(z.coerce.string())
      .mutation(async ({ input, ctx }) => {
        await deleteDriverVehicle(input, ctx.accessToken);
        return { success: true };
      }),
  }),

  routes: router({
    optimize: tenantProtectedProcedure
      .input(
        z.object({
          driverId: z.coerce.string(),
          baseAddress: z.string(),
          scheduledAt: z.date().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const startDate = input.scheduledAt ? new Date(input.scheduledAt) : new Date();
        startDate.setHours(0, 0, 0, 0);
        const endDate = input.scheduledAt ? new Date(input.scheduledAt) : new Date();
        endDate.setHours(23, 59, 59, 999);

        const deliveries = await getDeliveries(
          {
            driverId: input.driverId,
            startDate,
            endDate,
          },
          ctx.accessToken
        );

        const openDeliveries = deliveries.filter(
          delivery => delivery.status !== "entregue" && delivery.status !== "cancelado"
        );

        const stops = openDeliveries.map(delivery => ({
          id: delivery.id,
          address: delivery.destinationAddress,
        }));

        const optimized = await optimizeByProximity(input.baseAddress, stops);

        return {
          baseAddress: input.baseAddress,
          driverId: input.driverId,
          deliveries: optimized.map(entry => ({
            ...openDeliveries.find(delivery => delivery.id === entry.id)!,
            routeOrder: entry.routeOrder,
            distanceFromPreviousKm: entry.distanceFromPreviousKm,
            coordinates: entry.coordinates,
          })),
        };
      }),

    geocode: tenantProtectedProcedure
      .input(z.object({ address: z.string() }))
      .query(async ({ input }) => {
        const point = await geocodeAddress(input.address);
        return point;
      }),
  }),

  users: router({
    list: adminProcedure.query(async ({ ctx }) => getUsers(ctx.accessToken)),

    create: adminProcedure
      .input(
        z.object({
          email: z.string().email(),
          password: z.string().min(6).optional(),
          name: z.string().optional(),
          role: z.enum(["superadmin", "admin", "motorista"]).optional(),
          tenantId: z.coerce.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (input.role === "superadmin" && ctx.user?.role !== "superadmin") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only superadmin can create superadmin users",
          });
        }

        const tenantId =
          input.role === "superadmin"
            ? null
            : ctx.user?.role === "superadmin"
              ? input.tenantId ?? null
              : ctx.user?.tenantId ?? null;

        if (input.role !== "superadmin" && !tenantId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "tenantId is required for non-superadmin users",
          });
        }

        const user = await createAuthUser({
          ...input,
          tenantId,
        });
        return { success: true, user };
      }),

    update: adminProcedure
      .input(
        z.object({
          id: z.coerce.string(),
          name: z.string().optional(),
          email: z.string().optional(),
          role: z.enum(["superadmin", "admin", "motorista"]).optional(),
          loginMethod: z.string().optional(),
          tenantId: z.coerce.string().nullable().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (input.role === "superadmin" && ctx.user?.role !== "superadmin") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only superadmin can assign superadmin role",
          });
        }

        const { id, ...updates } = input;
        await updateUser(id, updates, ctx.accessToken);
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.coerce.string() }))
      .mutation(async ({ input, ctx }) => {
        await deleteUserAccount(input.id, ctx.accessToken);
        return { success: true };
      }),
  }),

  tenants: router({
    list: superadminProcedure.query(async ({ ctx }) => getTenants(ctx.accessToken)),

    create: superadminProcedure
      .input(
        z.object({
          name: z.string().min(1),
          slug: z.string().min(1),
          contactName: z.string().optional(),
          contactEmail: z.string().email().optional().or(z.literal("")),
          contactPhone: z.string().optional(),
          status: z.enum(["active", "suspended"]).optional(),
          paymentStatus: z.enum(["ok", "pending", "overdue"]).optional(),
          paymentDueAt: z.date().nullable().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const tenant = await createTenant(
          {
            ...input,
            contactEmail: input.contactEmail || null,
            paymentDueAt: input.paymentDueAt ?? null,
          },
          ctx.accessToken
        );
        return { success: true, tenant };
      }),

    update: superadminProcedure
      .input(
        z.object({
          id: z.string().uuid(),
          name: z.string().optional(),
          slug: z.string().optional(),
          contactName: z.string().optional().nullable(),
          contactEmail: z.string().email().optional().nullable(),
          contactPhone: z.string().optional().nullable(),
          status: z.enum(["active", "suspended"]).optional(),
          paymentStatus: z.enum(["ok", "pending", "overdue"]).optional(),
          paymentDueAt: z.date().nullable().optional(),
          notes: z.string().optional().nullable(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { id, ...updates } = input;
        await updateTenant(id, updates, ctx.accessToken);
        return { success: true };
      }),

    delete: superadminProcedure
      .input(z.object({ id: z.string().uuid() }))
      .mutation(async ({ input, ctx }) => {
        await deleteTenant(input.id, ctx.accessToken);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
