import { describe, expect, it, beforeEach, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };

  return { ctx };
}

describe("deliveries router", () => {
  let ctx: TrpcContext;

  beforeEach(() => {
    const context = createAuthContext();
    ctx = context.ctx;
  });

  it("should list deliveries", async () => {
    const caller = appRouter.createCaller(ctx);
    const result = await caller.deliveries.list({});
    expect(Array.isArray(result)).toBe(true);
  });

  it("should filter deliveries by status", async () => {
    const caller = appRouter.createCaller(ctx);
    const result = await caller.deliveries.list({ status: "pendente" });
    expect(Array.isArray(result)).toBe(true);
    // All returned deliveries should have status "pendente"
    result.forEach((delivery: any) => {
      expect(delivery.status).toBe("pendente");
    });
  });

  it("should create a delivery", async () => {
    const caller = appRouter.createCaller(ctx);
    const result = await caller.deliveries.create({
      clientName: "Test Client",
      originAddress: "Rua A, 123",
      destinationAddress: "Rua B, 456",
    });
    expect(result.success).toBe(true);
  });

  it("should update delivery status", async () => {
    const caller = appRouter.createCaller(ctx);
    const result = await caller.deliveries.update({
      id: 1,
      status: "em_rota",
    });
    expect(result.success).toBe(true);
  });
});

describe("drivers router", () => {
  let ctx: TrpcContext;

  beforeEach(() => {
    const context = createAuthContext();
    ctx = context.ctx;
  });

  it("should list drivers", async () => {
    const caller = appRouter.createCaller(ctx);
    const result = await caller.drivers.list({});
    expect(Array.isArray(result)).toBe(true);
  });

  it("should create a driver", async () => {
    const caller = appRouter.createCaller(ctx);
    const result = await caller.drivers.create({
      name: "Test Driver",
      email: "driver@example.com",
      phone: "11999999999",
      vehicle: "Van",
    });
    expect(result.success).toBe(true);
  });

  it("should update driver status", async () => {
    const caller = appRouter.createCaller(ctx);
    const result = await caller.drivers.update({
      id: 1,
      status: "available",
    });
    expect(result.success).toBe(true);
  });
});
