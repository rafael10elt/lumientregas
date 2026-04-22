import type { SupabaseClient } from "@supabase/supabase-js";
import {
  type Delivery,
  type Driver,
  type InsertDelivery,
  type InsertDriver,
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

function mapDelivery(row: Record<string, any>): Delivery {
  return {
    id: Number(row.id),
    clientName: String(row.clientName),
    originAddress: String(row.originAddress),
    originLat: row.originLat ?? null,
    originLng: row.originLng ?? null,
    destinationAddress: String(row.destinationAddress),
    destinationLat: row.destinationLat ?? null,
    destinationLng: row.destinationLng ?? null,
    driverId: row.driverId == null ? null : Number(row.driverId),
    createdByUserId: row.createdByUserId == null ? null : Number(row.createdByUserId),
    status: row.status,
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
        scheduledAt: toIsoString(delivery.scheduledAt),
        createdAt: toIsoString(delivery.createdAt),
        updatedAt: toIsoString(delivery.updatedAt),
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
  const { error } = await db
    .from("deliveries")
    .update(
      removeUndefined({
        ...updates,
        scheduledAt: toIsoString(updates.scheduledAt),
        updatedAt: new Date().toISOString(),
      })
    )
    .eq("id", id);

  if (error) throw error;
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
