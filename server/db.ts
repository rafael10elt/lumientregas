import type { SupabaseClient } from "@supabase/supabase-js";
import {
  type Delivery,
  type Driver,
  type DriverVehicle,
  type InsertDelivery,
  type InsertDriver,
  type InsertDriverVehicle,
  type InsertUser,
  type User,
} from "../drizzle/schema";
import { createSupabaseAdminClient, createSupabaseAnonClient } from "./_core/supabase";

function toIsoString(value: Date | string | null | undefined) {
  if (value == null) return undefined;
  return value instanceof Date ? value.toISOString() : value;
}

function toDate(value: string | Date | null | undefined) {
  if (value == null) return null;
  return value instanceof Date ? value : new Date(value);
}

function removeUndefined<T extends Record<string, unknown>>(value: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined)
  ) as Partial<T>;
}

function mapUser(row: Record<string, any>): User {
  return {
    id: Number(row.id),
    openId: String(row.openId),
    authUserId: row.authUserId ?? null,
    name: row.name ?? null,
    email: row.email ?? null,
    loginMethod: row.loginMethod ?? null,
    role: row.role,
    createdAt: toDate(row.createdAt)!,
    updatedAt: toDate(row.updatedAt)!,
    lastSignedIn: toDate(row.lastSignedIn)!,
  };
}

function mapDriver(row: Record<string, any>): Driver {
  return {
    id: Number(row.id),
    name: String(row.name),
    email: row.email ?? null,
    phone: row.phone ?? null,
    vehicle: row.vehicle ?? null,
    status: row.status,
    createdAt: toDate(row.createdAt)!,
    updatedAt: toDate(row.updatedAt)!,
  };
}

function mapDriverVehicle(row: Record<string, any>): DriverVehicle {
  return {
    id: Number(row.id),
    driverId: Number(row.driverId),
    model: String(row.model),
    plate: String(row.plate),
    nickname: row.nickname ?? null,
    isPrimary: Boolean(row.isPrimary),
    createdAt: toDate(row.createdAt)!,
    updatedAt: toDate(row.updatedAt)!,
  };
}

function mapDelivery(row: Record<string, any>): Delivery {
  return {
    id: Number(row.id),
    clientName: String(row.clientName),
    originPostalCode: row.originPostalCode ?? null,
    originAddress: String(row.originAddress),
    originLat: row.originLat ?? null,
    originLng: row.originLng ?? null,
    destinationPostalCode: row.destinationPostalCode ?? null,
    destinationAddress: String(row.destinationAddress),
    destinationLat: row.destinationLat ?? null,
    destinationLng: row.destinationLng ?? null,
    driverId: row.driverId == null ? null : Number(row.driverId),
    createdByUserId: row.createdByUserId == null ? null : Number(row.createdByUserId),
    status: row.status,
    routeOrder: row.routeOrder == null ? null : Number(row.routeOrder),
    scheduledAt: toDate(row.scheduledAt),
    notes: row.notes ?? null,
    distance: row.distance ?? null,
    estimatedTime: row.estimatedTime ?? null,
    createdAt: toDate(row.createdAt)!,
    updatedAt: toDate(row.updatedAt)!,
  };
}

function clientFor(accessToken?: string | null): SupabaseClient {
  return accessToken ? createSupabaseAnonClient(accessToken) : createSupabaseAdminClient();
}

export async function getUserByAuthUserId(authUserId: string) {
  const db = createSupabaseAdminClient();

  const { data, error } = await db
    .from("users")
    .select("*")
    .eq("authUserId", authUserId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapUser(data) : undefined;
}

export async function ensureUserProfile(input: InsertUser): Promise<void> {
  if (!input.authUserId) {
    throw new Error("authUserId is required");
  }

  const db = createSupabaseAdminClient();
  const values = removeUndefined({
    openId: input.openId,
    authUserId: input.authUserId,
    name: input.name ?? null,
    email: input.email ?? null,
    loginMethod: input.loginMethod ?? "supabase",
    role: input.role ?? "user",
    lastSignedIn: toIsoString(input.lastSignedIn) ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const { error } = await db.from("users").upsert(values, {
    onConflict: "authUserId",
  });

  if (error) {
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = createSupabaseAdminClient();
  const { data, error } = await db
    .from("users")
    .select("*")
    .eq("openId", openId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapUser(data) : undefined;
}

export async function getUsers() {
  const db = createSupabaseAdminClient();
  const { data, error } = await db
    .from("users")
    .select("*")
    .order("createdAt", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapUser);
}

export async function updateUser(
  id: number,
  updates: Partial<Pick<InsertUser, "name" | "email" | "loginMethod"> & { role: User["role"] }>
) {
  const db = createSupabaseAdminClient();
  const { error } = await db
    .from("users")
    .update(
      removeUndefined({
        ...updates,
        updatedAt: new Date().toISOString(),
      })
    )
    .eq("id", id);

  if (error) {
    throw error;
  }
}

export async function createAuthUser(input: {
  email: string;
  password?: string;
  name?: string | null;
  role?: User["role"];
}) {
  const db = createSupabaseAdminClient();
  const { data, error } = await db.auth.admin.createUser({
    email: input.email,
    password: input.password ?? "12345678",
    email_confirm: true,
    user_metadata: {
      full_name: input.name ?? input.email,
      name: input.name ?? input.email,
    },
  });

  if (error) {
    throw error;
  }

  if (!data.user?.id) {
    throw new Error("Não foi possível criar o usuário");
  }

  await ensureUserProfile({
    openId: data.user.id,
    authUserId: data.user.id,
    name: input.name ?? input.email,
    email: input.email,
    loginMethod: "supabase",
    role: input.role ?? "user",
  });

  return getUserByAuthUserId(data.user.id);
}

export async function deleteUserAccount(id: number) {
  const db = createSupabaseAdminClient();
  const { data, error } = await db
    .from("users")
    .select("authUserId")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data?.authUserId) {
    const { error: deleteProfileError } = await db.from("users").delete().eq("id", id);
    if (deleteProfileError) {
      throw deleteProfileError;
    }
    return;
  }

  const { error: authError } = await db.auth.admin.deleteUser(data.authUserId);
  if (authError) {
    throw authError;
  }

  const { error: deleteProfileError } = await db.from("users").delete().eq("id", id);
  if (deleteProfileError) {
    throw deleteProfileError;
  }
}

export async function getDeliveries(
  filters?: {
    status?: string;
    driverId?: number;
    startDate?: Date;
    endDate?: Date;
  },
  accessToken?: string | null
) {
  const db = clientFor(accessToken);
  let query = db.from("deliveries").select("*");

  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.driverId !== undefined) query = query.eq("driverId", filters.driverId);
  if (filters?.startDate) query = query.gte("scheduledAt", filters.startDate.toISOString());
  if (filters?.endDate) query = query.lte("scheduledAt", filters.endDate.toISOString());

  const { data, error } = await query.order("createdAt", { ascending: false });
  if (error) throw error;

  return (data ?? []).map(mapDelivery);
}

export async function getDeliveryById(id: number, accessToken?: string | null) {
  const db = clientFor(accessToken);
  const { data, error } = await db.from("deliveries").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? mapDelivery(data) : undefined;
}

export async function createDelivery(delivery: InsertDelivery, accessToken?: string | null) {
  const db = clientFor(accessToken);
  const { data, error } = await db
    .from("deliveries")
    .insert(
      removeUndefined({
        ...delivery,
        originPostalCode: delivery.originPostalCode ?? null,
        scheduledAt: toIsoString(delivery.scheduledAt),
        createdAt: toIsoString(delivery.createdAt),
        updatedAt: toIsoString(delivery.updatedAt),
        destinationPostalCode: delivery.destinationPostalCode ?? null,
        routeOrder: delivery.routeOrder ?? null,
      })
    )
    .select("*")
    .single();

  if (error) throw error;
  return data ? mapDelivery(data) : null;
}

export async function updateDelivery(
  id: number,
  updates: Partial<InsertDelivery>,
  accessToken?: string | null
) {
  const db = clientFor(accessToken);
  const normalizedRouteOrder =
    updates.routeOrder === undefined ? undefined : updates.routeOrder;
  const { error } = await db
    .from("deliveries")
    .update(
      removeUndefined({
        ...updates,
        routeOrder: normalizedRouteOrder,
        scheduledAt: toIsoString(updates.scheduledAt),
        updatedAt: new Date().toISOString(),
      })
    )
    .eq("id", id);

  if (error) throw error;
}

export async function deleteDelivery(id: number, accessToken?: string | null) {
  const db = clientFor(accessToken);
  const { error } = await db.from("deliveries").delete().eq("id", id);
  if (error) throw error;
}

export async function updateDeliveriesOrder(
  updates: Array<{ id: number; routeOrder: number; driverId?: number | null; scheduledAt?: Date | string | null }>,
  accessToken?: string | null
) {
  const db = clientFor(accessToken);
  for (const item of updates) {
    const { error } = await db
      .from("deliveries")
      .update({
        routeOrder: item.routeOrder,
        ...(item.driverId !== undefined ? { driverId: item.driverId } : {}),
        ...(item.scheduledAt !== undefined ? { scheduledAt: toIsoString(item.scheduledAt) } : {}),
        updatedAt: new Date().toISOString(),
      })
      .eq("id", item.id);

    if (error) {
      throw error;
    }
  }
}

export async function getDrivers(accessToken?: string | null) {
  const db = clientFor(accessToken);
  const { data, error } = await db.from("drivers").select("*").order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapDriver);
}

export async function getDriverById(id: number, accessToken?: string | null) {
  const db = clientFor(accessToken);
  const { data, error } = await db.from("drivers").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? mapDriver(data) : undefined;
}

export async function createDriver(driver: InsertDriver, accessToken?: string | null) {
  const db = clientFor(accessToken);
  const { data, error } = await db
    .from("drivers")
    .insert(
      removeUndefined({
        ...driver,
        createdAt: toIsoString(driver.createdAt),
        updatedAt: toIsoString(driver.updatedAt),
      })
    )
    .select("*")
    .single();

  if (error) throw error;
  return data ? mapDriver(data) : null;
}

export async function updateDriver(
  id: number,
  updates: Partial<InsertDriver>,
  accessToken?: string | null
) {
  const db = clientFor(accessToken);
  const { error } = await db
    .from("drivers")
    .update(
      removeUndefined({
        ...updates,
        updatedAt: new Date().toISOString(),
      })
    )
    .eq("id", id);

  if (error) throw error;
}

export async function deleteDriver(id: number, accessToken?: string | null) {
  const db = clientFor(accessToken);
  const { error } = await db.from("drivers").delete().eq("id", id);
  if (error) throw error;
}

export async function getDriverVehicles(driverId?: number) {
  const db = createSupabaseAdminClient();
  let query = db.from("driver_vehicles").select("*");
  if (driverId !== undefined) {
    query = query.eq("driverId", driverId);
  }
  const { data, error } = await query.order("isPrimary", { ascending: false }).order("createdAt", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapDriverVehicle);
}

export async function createDriverVehicle(vehicle: InsertDriverVehicle, accessToken?: string | null) {
  const db = clientFor(accessToken);
  const { data, error } = await db
    .from("driver_vehicles")
    .insert(
      removeUndefined({
        ...vehicle,
        isPrimary: vehicle.isPrimary ?? false,
        createdAt: toIsoString(vehicle.createdAt),
        updatedAt: toIsoString(vehicle.updatedAt),
      })
    )
    .select("*")
    .single();
  if (error) throw error;
  return data ? mapDriverVehicle(data) : null;
}

export async function updateDriverVehicle(
  id: number,
  updates: Partial<InsertDriverVehicle>,
  accessToken?: string | null
) {
  const db = clientFor(accessToken);
  const { error } = await db
    .from("driver_vehicles")
    .update(
      removeUndefined({
        ...updates,
        updatedAt: new Date().toISOString(),
      })
    )
    .eq("id", id);
  if (error) throw error;
}

export async function deleteDriverVehicle(id: number, accessToken?: string | null) {
  const db = clientFor(accessToken);
  const { error } = await db.from("driver_vehicles").delete().eq("id", id);
  if (error) throw error;
}
