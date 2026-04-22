import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  Delivery,
  Driver,
  InsertDelivery,
  InsertDriver,
  InsertUser,
  User,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: SupabaseClient | null = null;

function getSupabaseConfig() {
  return {
    url: ENV.supabaseUrl,
    serviceRoleKey: ENV.supabaseServiceRoleKey,
  };
}

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

function normalizeUser(row: Record<string, any>): User {
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

function normalizeDriver(row: Record<string, any>): Driver {
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

function normalizeDelivery(row: Record<string, any>): Delivery {
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

// Lazily create the Supabase admin client so local tooling can run without a DB.
export async function getDb() {
  if (_db) {
    return _db;
  }

  const { url, serviceRoleKey } = getSupabaseConfig();
  if (!url || !serviceRoleKey) {
    return null;
  }

  _db = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: Record<string, unknown> = {
      openId: user.openId,
      updatedAt: new Date().toISOString(),
    };

    const textFields = ["authUserId", "name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      values[field] = value ?? null;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = toIsoString(user.lastSignedIn);
    }

    if (user.role !== undefined) {
      values.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date().toISOString();
    }

    const { error } = await db.from("users").upsert(values, {
      onConflict: "openId",
    });

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const { data, error } = await db
    .from("users")
    .select("*")
    .eq("openId", openId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? normalizeUser(data) : undefined;
}

export async function getDeliveries(filters?: {
  status?: string;
  driverId?: number;
  startDate?: Date;
  endDate?: Date;
}) {
  const db = await getDb();
  if (!db) return [];

  let query = db.from("deliveries").select("*");

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }
  if (filters?.driverId !== undefined) {
    query = query.eq("driverId", filters.driverId);
  }
  if (filters?.startDate) {
    query = query.gte("scheduledAt", filters.startDate.toISOString());
  }
  if (filters?.endDate) {
    query = query.lte("scheduledAt", filters.endDate.toISOString());
  }

  const { data, error } = await query.order("createdAt", { ascending: false });
  if (error) {
    throw error;
  }

  return (data ?? []).map(normalizeDelivery);
}

export async function getDeliveryById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const { data, error } = await db
    .from("deliveries")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? normalizeDelivery(data) : undefined;
}

export async function createDelivery(delivery: InsertDelivery) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

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

  if (error) {
    throw error;
  }

  return data ? normalizeDelivery(data) : null;
}

export async function updateDelivery(id: number, updates: Partial<InsertDelivery>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

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

  if (error) {
    throw error;
  }
}

export async function getDrivers() {
  const db = await getDb();
  if (!db) return [];

  const { data, error } = await db.from("drivers").select("*").order("name", { ascending: true });
  if (error) {
    throw error;
  }

  return (data ?? []).map(normalizeDriver);
}

export async function getDriverById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const { data, error } = await db
    .from("drivers")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? normalizeDriver(data) : undefined;
}

export async function createDriver(driver: InsertDriver) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

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

  if (error) {
    throw error;
  }

  return data ? normalizeDriver(data) : null;
}

export async function updateDriver(id: number, updates: Partial<InsertDriver>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { error } = await db
    .from("drivers")
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
