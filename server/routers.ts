import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  createDelivery,
  createDriver,
  getDeliveries,
  getDeliveryById,
  getDrivers,
  getDriverById,
  updateDelivery,
  updateDriver,
} from "./db";
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
          originAddress: z.string(),
          originLat: z.string().optional(),
          originLng: z.string().optional(),
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
        await createDelivery(input, ctx.accessToken);
        return { success: true };
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          status: z.enum(["pendente", "em_rota", "entregue", "cancelado"]).optional(),
          driverId: z.number().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { id, ...updates } = input;
        await updateDelivery(id, updates, ctx.accessToken);
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
  }),
});

export type AppRouter = typeof appRouter;
