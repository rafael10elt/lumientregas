import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  createAuthUser,
  createDelivery,
  createDriverVehicle,
  deleteDelivery,
  createDriver,
  deleteDriverVehicle,
  deleteDriver,
  getUserByOpenId,
  getDeliveries,
  getDeliveryById,
  getDriverVehicles,
  getDrivers,
  getDriverById,
  getUsers,
  deleteUserAccount,
  updateDelivery,
  updateDriver,
  updateDeliveriesOrder,
  updateDriverVehicle,
  updateUser,
} from "./db";
import { geocodeAddress, optimizeByProximity } from "./_core/routePlanner";
import { z } from "zod";

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

  deliveries: router({
    list: protectedProcedure
      .input(
        z
          .object({
            status: z.string().optional(),
            driverId: z.number().optional(),
            startDate: z.date().optional(),
            endDate: z.date().optional(),
          })
          .optional()
      )
      .query(async ({ input, ctx }) => getDeliveries(input, ctx.accessToken)),

    getById: protectedProcedure
      .input(z.number())
      .query(async ({ input, ctx }) => getDeliveryById(input, ctx.accessToken)),

    create: protectedProcedure
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
          driverId: z.number().optional(),
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

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          status: z.enum(["pendente", "em_rota", "entregue", "cancelado"]).optional(),
          driverId: z.number().optional(),
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

    delete: protectedProcedure
      .input(z.number())
      .mutation(async ({ input, ctx }) => {
        await deleteDelivery(input, ctx.accessToken);
        return { success: true };
      }),

    bulkDelete: protectedProcedure
      .input(z.array(z.number()))
      .mutation(async ({ input, ctx }) => {
        for (const id of input) {
          await deleteDelivery(id, ctx.accessToken);
        }
        return { success: true };
      }),

    bulkReschedule: protectedProcedure
      .input(
        z.object({
          ids: z.array(z.number()),
          scheduledAt: z.date(),
          driverId: z.number().optional(),
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

    reorder: protectedProcedure
      .input(
        z.object({
          driverId: z.number(),
          scheduledAt: z.date().optional(),
          order: z.array(z.object({ id: z.number(), routeOrder: z.number() })),
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
    list: protectedProcedure.query(async ({ ctx }) => getDrivers(ctx.accessToken)),

    getById: protectedProcedure
      .input(z.number())
      .query(async ({ input, ctx }) => getDriverById(input, ctx.accessToken)),

    create: protectedProcedure
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

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
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

    delete: protectedProcedure
      .input(z.number())
      .mutation(async ({ input, ctx }) => {
        await deleteDriver(input, ctx.accessToken);
        return { success: true };
      }),
  }),

  driverVehicles: router({
    list: protectedProcedure
      .input(z.object({ driverId: z.number().optional() }).optional())
      .query(async ({ input }) => getDriverVehicles(input?.driverId)),

    create: protectedProcedure
      .input(
        z.object({
          driverId: z.number(),
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

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
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

    delete: protectedProcedure
      .input(z.number())
      .mutation(async ({ input, ctx }) => {
        await deleteDriverVehicle(input, ctx.accessToken);
        return { success: true };
      }),
  }),

  routes: router({
    optimize: protectedProcedure
      .input(
        z.object({
          driverId: z.number(),
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

    geocode: protectedProcedure
      .input(z.object({ address: z.string() }))
      .query(async ({ input }) => {
        const point = await geocodeAddress(input.address);
        return point;
      }),
  }),

  users: router({
    list: adminProcedure.query(async () => getUsers()),

    create: adminProcedure
      .input(
        z.object({
          email: z.string().email(),
          password: z.string().min(6).optional(),
          name: z.string().optional(),
          role: z.enum(["user", "admin"]).optional(),
        })
      )
      .mutation(async ({ input }) => {
        const user = await createAuthUser(input);
        return { success: true, user };
      }),

    update: adminProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().optional(),
          email: z.string().optional(),
          role: z.enum(["user", "admin"]).optional(),
          loginMethod: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...updates } = input;
        await updateUser(id, updates);
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteUserAccount(input.id);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
