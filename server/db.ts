<<<<<<< HEAD
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  Client,
  ClientBase,
  Delivery,
  Driver,
  DriverVehicle,
  InsertClient,
  InsertClientBase,
  InsertDelivery,
  InsertDriver,
  InsertDriverVehicle,
  InsertTenant,
  InsertUser,
  Tenant,
  User,
=======
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
>>>>>>> parent of f08e5f3 (up)
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

function toNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function removeUndefined<T extends Record<string, unknown>>(value: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined)
  ) as Partial<T>;
}

function normalizeTenant(row: Record<string, any>): Tenant {
  return {
<<<<<<< HEAD
    ...row,
    id: String(row.id),
    createdAt: toDate(row.createdAt)!,
    updatedAt: toDate(row.updatedAt)!,
    paymentDueAt: toDate(row.paymentDueAt),
  } as Tenant;
}

function normalizeUser(row: Record<string, any>): User {
  return {
    ...row,
    id: String(row.id),
    tenantId: row.tenantId == null ? null : String(row.tenantId),
    tenantName: row.tenantName ?? null,
    tenantStatus: row.tenantStatus ?? null,
    tenantPaymentStatus: row.tenantPaymentStatus ?? null,
=======
    id: Number(row.id),
    openId: String(row.openId),
    authUserId: row.authUserId ?? null,
    name: row.name ?? null,
    email: row.email ?? null,
    loginMethod: row.loginMethod ?? null,
    role: row.role,
>>>>>>> parent of f08e5f3 (up)
    createdAt: toDate(row.createdAt)!,
    updatedAt: toDate(row.updatedAt)!,
    lastSignedIn: toDate(row.lastSignedIn)!,
  } as User;
}

function normalizeDriver(row: Record<string, any>): Driver {
  return {
<<<<<<< HEAD
    ...row,
    id: String(row.id),
    tenantId: String(row.tenantId),
    userId: row.userId == null ? null : String(row.userId),
=======
    id: Number(row.id),
    name: String(row.name),
    email: row.email ?? null,
    phone: row.phone ?? null,
    vehicle: row.vehicle ?? null,
    status: row.status,
>>>>>>> parent of f08e5f3 (up)
    createdAt: toDate(row.createdAt)!,
    updatedAt: toDate(row.updatedAt)!,
  } as Driver;
}

function normalizeDriverVehicle(row: Record<string, any>): DriverVehicle {
  return {
<<<<<<< HEAD
    ...row,
    id: String(row.id),
    tenantId: String(row.tenantId),
    driverId: String(row.driverId),
=======
    id: Number(row.id),
    driverId: Number(row.driverId),
    model: String(row.model),
    plate: String(row.plate),
    nickname: row.nickname ?? null,
>>>>>>> parent of f08e5f3 (up)
    isPrimary: Boolean(row.isPrimary),
    createdAt: toDate(row.createdAt)!,
    updatedAt: toDate(row.updatedAt)!,
  } as DriverVehicle;
}

function normalizeClient(row: Record<string, any>): Client {
  return {
<<<<<<< HEAD
    ...row,
    id: String(row.id),
    tenantId: String(row.tenantId),
    createdAt: toDate(row.createdAt)!,
    updatedAt: toDate(row.updatedAt)!,
  } as Client;
}

function normalizeClientBase(row: Record<string, any>): ClientBase {
  return {
    ...row,
    id: String(row.id),
    tenantId: String(row.tenantId),
    clientId: String(row.clientId),
    isDefault: Boolean(row.isDefault),
    latitude: toNumber(row.latitude),
    longitude: toNumber(row.longitude),
    createdAt: toDate(row.createdAt)!,
    updatedAt: toDate(row.updatedAt)!,
  } as ClientBase;
}

function normalizeDelivery(row: Record<string, any>): Delivery {
  return {
    ...row,
    id: String(row.id),
    tenantId: String(row.tenantId),
    clientId: row.clientId == null ? null : String(row.clientId),
    baseId: row.baseId == null ? null : String(row.baseId),
    originLatitude: toNumber(row.originLatitude),
    originLongitude: toNumber(row.originLongitude),
    destinationLatitude: toNumber(row.destinationLatitude),
    destinationLongitude: toNumber(row.destinationLongitude),
    driverId: row.driverId == null ? null : String(row.driverId),
    createdByUserId: row.createdByUserId == null ? null : String(row.createdByUserId),
=======
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
>>>>>>> parent of f08e5f3 (up)
    routeOrder: row.routeOrder == null ? null : Number(row.routeOrder),
    scheduledAt: toDate(row.scheduledAt),
    createdAt: toDate(row.createdAt)!,
    updatedAt: toDate(row.updatedAt)!,
  } as Delivery;
}

<<<<<<< HEAD
export async function getDb() {
  if (_db) return _db;

  const { url, serviceRoleKey } = getSupabaseConfig();
  if (!url || !serviceRoleKey) return null;

  _db = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return _db;
}

export async function getTenantById(id: string) {
  const db = await getDb();
  if (!db) return undefined;

  const { data, error } = await db.from("tenants").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? normalizeTenant(data) : undefined;
}

export async function getTenants() {
  const db = await getDb();
  if (!db) return [];

  const { data, error } = await db.from("tenants").select("*").order("createdAt", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(normalizeTenant);
=======
function clientFor(accessToken?: string | null): SupabaseClient {
  return accessToken ? createSupabaseAnonClient(accessToken) : createSupabaseAdminClient();
>>>>>>> parent of f08e5f3 (up)
}

export async function createTenantRecord(tenant: InsertTenant) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { data, error } = await db
    .from("tenants")
    .insert(
      removeUndefined({
        ...tenant,
        paymentDueAt: toIsoString(tenant.paymentDueAt),
        createdAt: toIsoString(tenant.createdAt),
        updatedAt: toIsoString(tenant.updatedAt),
      })
    )
    .select("*")
    .single();

  if (error) throw error;
  return data ? normalizeTenant(data) : null;
}

export async function updateTenantRecord(id: string, updates: Partial<InsertTenant>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { error } = await db
    .from("tenants")
    .update(
      removeUndefined({
        ...updates,
        paymentDueAt: toIsoString(updates.paymentDueAt),
        updatedAt: new Date().toISOString(),
      })
    )
    .eq("id", id);

  if (error) throw error;
}

export async function deleteTenantRecord(id: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { error } = await db.from("tenants").delete().eq("id", id);
  if (error) throw error;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

<<<<<<< HEAD
  const values: Record<string, unknown> = {
    openId: user.openId,
=======
  const db = createSupabaseAdminClient();
  const values = removeUndefined({
    openId: input.openId,
    authUserId: input.authUserId,
    name: input.name ?? null,
    email: input.email ?? null,
    loginMethod: input.loginMethod ?? "supabase",
    role: input.role ?? "user",
    lastSignedIn: toIsoString(input.lastSignedIn) ?? new Date().toISOString(),
>>>>>>> parent of f08e5f3 (up)
    updatedAt: new Date().toISOString(),
  };

  const nullableTextFields = ["authUserId", "tenantId", "name", "email", "loginMethod"] as const;
  type NullableTextField = (typeof nullableTextFields)[number];
  nullableTextFields.forEach(field => {
    const value = user[field];
    if (value !== undefined) {
      values[field] = value ?? null;
    }
  });

  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = toIsoString(user.lastSignedIn);
  }

  if (user.role !== undefined) {
    values.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "superadmin";
  }

  if (!values.lastSignedIn) {
    values.lastSignedIn = new Date().toISOString();
  }

  const { error } = await db.from("users").upsert(values, { onConflict: "openId" });
  if (error) throw error;
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;

  const { data, error } = await db
    .from("users")
    .select("*")
    .eq("openId", openId)
    .maybeSingle();

  if (error) throw error;
  return data ? normalizeUser(data) : undefined;
}

export async function getUserById(id: string) {
  const db = await getDb();
  if (!db) return undefined;

  const { data, error } = await db
    .from("users")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data ? normalizeUser(data) : undefined;
}

<<<<<<< HEAD
export async function getUsers(tenantId?: string) {
  const db = await getDb();
  if (!db) return [];

  let query = db.from("users").select("*");
  if (tenantId) {
    query = query.eq("tenantId", tenantId);
  }

  const { data, error } = await query.order("createdAt", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(normalizeUser);
}

export async function updateUser(id: string, updates: Partial<InsertUser>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

=======
export async function updateUser(
  id: number,
  updates: Partial<Pick<InsertUser, "name" | "email" | "loginMethod"> & { role: User["role"] }>
) {
  const db = createSupabaseAdminClient();
>>>>>>> parent of f08e5f3 (up)
  const { error } = await db
    .from("users")
    .update(
      removeUndefined({
        ...updates,
        updatedAt: new Date().toISOString(),
      })
    )
    .eq("id", id);

  if (error) throw error;
}

<<<<<<< HEAD
export async function deleteUserAccount(id: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { error } = await db.from("users").delete().eq("id", id);
  if (error) throw error;
}

export async function getClients(tenantId?: string) {
  const db = await getDb();
  if (!db) return [];

  let query = db.from("clients").select("*");
  if (tenantId) {
    query = query.eq("tenantId", tenantId);
  }

  const { data, error } = await query.order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(normalizeClient);
}

export async function getClientById(id: string) {
  const db = await getDb();
  if (!db) return undefined;
  const { data, error } = await db.from("clients").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? normalizeClient(data) : undefined;
}

export async function createClientRecord(client: InsertClient) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { data, error } = await db
    .from("clients")
    .insert(removeUndefined({ ...client, createdAt: toIsoString(client.createdAt), updatedAt: toIsoString(client.updatedAt) }))
    .select("*")
    .single();
  if (error) throw error;
  return data ? normalizeClient(data) : null;
}

export async function updateClientRecord(id: string, updates: Partial<InsertClient>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { error } = await db
    .from("clients")
    .update(removeUndefined({ ...updates, updatedAt: new Date().toISOString() }))
    .eq("id", id);
  if (error) throw error;
}

export async function deleteClientRecord(id: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { error } = await db.from("clients").delete().eq("id", id);
  if (error) throw error;
}

export async function getClientBases(tenantId?: string, clientId?: string) {
  const db = await getDb();
  if (!db) return [];

  let query = db.from("client_bases").select("*");
  if (tenantId) query = query.eq("tenantId", tenantId);
  if (clientId) query = query.eq("clientId", clientId);

  const { data, error } = await query.order("isDefault", { ascending: false }).order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(normalizeClientBase);
}

export async function getClientBaseById(id: string) {
  const db = await getDb();
  if (!db) return undefined;
  const { data, error } = await db.from("client_bases").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? normalizeClientBase(data) : undefined;
}

export async function createClientBase(base: InsertClientBase) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { data, error } = await db
    .from("client_bases")
    .insert(removeUndefined({ ...base, createdAt: toIsoString(base.createdAt), updatedAt: toIsoString(base.updatedAt) }))
    .select("*")
    .single();
  if (error) throw error;
  return data ? normalizeClientBase(data) : null;
}

export async function updateClientBase(id: string, updates: Partial<InsertClientBase>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { error } = await db
    .from("client_bases")
    .update(removeUndefined({ ...updates, updatedAt: new Date().toISOString() }))
    .eq("id", id);
  if (error) throw error;
}

export async function deleteClientBase(id: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { error } = await db.from("client_bases").delete().eq("id", id);
  if (error) throw error;
}

export async function getDrivers(tenantId?: string) {
  const db = await getDb();
  if (!db) return [];
=======
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
>>>>>>> parent of f08e5f3 (up)

  let query = db.from("drivers").select("*");
  if (tenantId) query = query.eq("tenantId", tenantId);

  const { data, error } = await query.order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(normalizeDriver);
}

<<<<<<< HEAD
export async function getDriverById(id: string) {
  const db = await getDb();
  if (!db) return undefined;
=======
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
>>>>>>> parent of f08e5f3 (up)
  const { data, error } = await db.from("drivers").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? normalizeDriver(data) : undefined;
}

export async function getDriverByUserId(userId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const { data, error } = await db.from("drivers").select("*").eq("userId", userId).maybeSingle();
  if (error) throw error;
  return data ? normalizeDriver(data) : undefined;
}

export async function createDriver(driver: InsertDriver) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { data, error } = await db
    .from("drivers")
    .insert(removeUndefined({ ...driver, createdAt: toIsoString(driver.createdAt), updatedAt: toIsoString(driver.updatedAt) }))
    .select("*")
    .single();
  if (error) throw error;
  return data ? normalizeDriver(data) : null;
}

<<<<<<< HEAD
export async function updateDriver(id: string, updates: Partial<InsertDriver>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
=======
export async function updateDriver(
  id: number,
  updates: Partial<InsertDriver>,
  accessToken?: string | null
) {
  const db = clientFor(accessToken);
>>>>>>> parent of f08e5f3 (up)
  const { error } = await db
    .from("drivers")
    .update(removeUndefined({ ...updates, updatedAt: new Date().toISOString() }))
    .eq("id", id);
  if (error) throw error;
}

<<<<<<< HEAD
export async function deleteDriver(id: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
=======
export async function deleteDriver(id: number, accessToken?: string | null) {
  const db = clientFor(accessToken);
>>>>>>> parent of f08e5f3 (up)
  const { error } = await db.from("drivers").delete().eq("id", id);
  if (error) throw error;
}

<<<<<<< HEAD
export async function getDriverVehicles(tenantId?: string, driverId?: string) {
  const db = await getDb();
  if (!db) return [];

=======
export async function getDriverVehicles(driverId?: number) {
  const db = createSupabaseAdminClient();
>>>>>>> parent of f08e5f3 (up)
  let query = db.from("driver_vehicles").select("*");
  if (tenantId) query = query.eq("tenantId", tenantId);
  if (driverId) query = query.eq("driverId", driverId);

  const { data, error } = await query.order("isPrimary", { ascending: false }).order("createdAt", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(normalizeDriverVehicle);
}

export async function getDriverVehicleById(id: string) {
  const db = await getDb();
  if (!db) return undefined;

  const { data, error } = await db
    .from("driver_vehicles")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data ? normalizeDriverVehicle(data) : undefined;
}

export async function createDriverVehicle(vehicle: InsertDriverVehicle) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { data, error } = await db
    .from("driver_vehicles")
    .insert(removeUndefined({ ...vehicle, createdAt: toIsoString(vehicle.createdAt), updatedAt: toIsoString(vehicle.updatedAt) }))
    .select("*")
    .single();
  if (error) throw error;
  return data ? normalizeDriverVehicle(data) : null;
}

<<<<<<< HEAD
export async function updateDriverVehicle(id: string, updates: Partial<InsertDriverVehicle>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
=======
export async function updateDriverVehicle(
  id: number,
  updates: Partial<InsertDriverVehicle>,
  accessToken?: string | null
) {
  const db = clientFor(accessToken);
>>>>>>> parent of f08e5f3 (up)
  const { error } = await db
    .from("driver_vehicles")
    .update(removeUndefined({ ...updates, updatedAt: new Date().toISOString() }))
    .eq("id", id);
  if (error) throw error;
}

<<<<<<< HEAD
export async function deleteDriverVehicle(id: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
=======
export async function deleteDriverVehicle(id: number, accessToken?: string | null) {
  const db = clientFor(accessToken);
>>>>>>> parent of f08e5f3 (up)
  const { error } = await db.from("driver_vehicles").delete().eq("id", id);
  if (error) throw error;
}

export async function getDeliveries(filters?: {
  tenantId?: string;
  status?: string;
  driverId?: string;
  clientId?: string;
  baseId?: string;
  startDate?: Date;
  endDate?: Date;
  onlyUncompleted?: boolean;
}) {
  const db = await getDb();
  if (!db) return [];

  let query = db.from("deliveries").select("*");
  if (filters?.tenantId) query = query.eq("tenantId", filters.tenantId);
  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.driverId !== undefined) query = query.eq("driverId", filters.driverId);
  if (filters?.clientId !== undefined) query = query.eq("clientId", filters.clientId);
  if (filters?.baseId !== undefined) query = query.eq("baseId", filters.baseId);
  if (filters?.startDate) query = query.gte("scheduledAt", filters.startDate.toISOString());
  if (filters?.endDate) query = query.lte("scheduledAt", filters.endDate.toISOString());
  if (filters?.onlyUncompleted) query = query.neq("status", "entregue").neq("status", "cancelado");

  const { data, error } = await query.order("routeOrder", { ascending: true, nullsFirst: false }).order("createdAt", {
    ascending: false,
  });
  if (error) throw error;
  return (data ?? []).map(normalizeDelivery);
}

export async function getDeliveryById(id: string) {
  const db = await getDb();
  if (!db) return undefined;
  const { data, error } = await db.from("deliveries").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? normalizeDelivery(data) : undefined;
}

export async function createDelivery(delivery: InsertDelivery) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { data, error } = await db
    .from("deliveries")
    .insert(removeUndefined({ ...delivery, scheduledAt: toIsoString(delivery.scheduledAt), createdAt: toIsoString(delivery.createdAt), updatedAt: toIsoString(delivery.updatedAt) }))
    .select("*")
    .single();
  if (error) throw error;
  return data ? normalizeDelivery(data) : null;
}

export async function updateDelivery(id: string, updates: Partial<InsertDelivery>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { error } = await db
    .from("deliveries")
    .update(removeUndefined({ ...updates, scheduledAt: toIsoString(updates.scheduledAt), updatedAt: new Date().toISOString() }))
    .eq("id", id);
  if (error) throw error;
}

export async function deleteDelivery(id: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { error } = await db.from("deliveries").delete().eq("id", id);
  if (error) throw error;
}

export async function bulkDeleteDeliveries(ids: string[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { error } = await db.from("deliveries").delete().in("id", ids);
  if (error) throw error;
}

export async function bulkRescheduleDeliveries(
  ids: string[],
  updates: { scheduledAt?: Date | string | null; driverId?: string | null; routeOrder?: number | null }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { error } = await db
    .from("deliveries")
    .update(removeUndefined({ ...updates, scheduledAt: toIsoString(updates.scheduledAt), updatedAt: new Date().toISOString() }))
    .in("id", ids);
  if (error) throw error;
}

export async function reorderDeliveries(
  updates: Array<{ id: string; routeOrder: number; driverId?: string | null; scheduledAt?: Date | string | null }>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  for (const update of updates) {
    const { error } = await db
      .from("deliveries")
      .update(removeUndefined({ routeOrder: update.routeOrder, driverId: update.driverId, scheduledAt: toIsoString(update.scheduledAt), updatedAt: new Date().toISOString() }))
      .eq("id", update.id);
    if (error) throw error;
  }
}
