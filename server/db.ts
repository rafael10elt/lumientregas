import type { SupabaseClient } from "@supabase/supabase-js";
import {
  type Client,
  type ClientBase,
  type Delivery,
  type Driver,
  type DriverVehicle,
  type InsertTenant,
  type InsertDelivery,
  type InsertClient,
  type InsertClientBase,
  type InsertDriver,
  type InsertDriverVehicle,
  type InsertUser,
  type Tenant,
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

function pickField<T>(row: Record<string, any>, ...keys: string[]): T | undefined {
  for (const key of keys) {
    if (row[key] !== undefined) {
      return row[key] as T;
    }
  }
  return undefined;
}

function mapUser(row: Record<string, any>): User {
  return {
    id: String(row.id),
    openId: String(row.openId),
    authUserId: row.authUserId ?? null,
    tenantId: row.tenantId ?? null,
    name: row.name ?? null,
    email: row.email ?? null,
    loginMethod: row.loginMethod ?? null,
    role: row.role,
    createdAt: toDate(row.createdAt)!,
    updatedAt: toDate(row.updatedAt)!,
    lastSignedIn: toDate(row.lastSignedIn)!,
  };
}

function mapTenant(row: Record<string, any>): Tenant {
  return {
    id: String(row.id),
    name: String(pickField<string>(row, "name") ?? ""),
    slug: String(pickField<string>(row, "slug") ?? ""),
    contactName: pickField<string | null>(row, "contactName", "contactname") ?? null,
    contactEmail: pickField<string | null>(row, "contactEmail", "contactemail") ?? null,
    contactPhone: pickField<string | null>(row, "contactPhone", "contactphone") ?? null,
    status: pickField(row, "status") as Tenant["status"],
    paymentStatus: pickField(row, "paymentStatus", "paymentstatus") as Tenant["paymentStatus"],
    paymentDueAt: toDate(pickField<string | Date | null>(row, "paymentDueAt", "paymentdueat")),
    notes: pickField<string | null>(row, "notes") ?? null,
    createdAt: toDate(pickField<string | Date>(row, "createdAt", "createdat"))!,
    updatedAt: toDate(pickField<string | Date>(row, "updatedAt", "updatedat"))!,
  };
}

function mapDriver(row: Record<string, any>): Driver {
  return {
    id: String(row.id),
    tenantId: String(row.tenantId),
    userId: row.userId ?? null,
    name: String(row.name),
    email: row.email ?? null,
    phone: row.phone ?? null,
    notes: row.notes ?? null,
    status: row.status,
    createdAt: toDate(row.createdAt)!,
    updatedAt: toDate(row.updatedAt)!,
  };
}

function mapDriverVehicle(row: Record<string, any>): DriverVehicle {
  return {
    id: String(row.id),
    driverId: String(row.driverId),
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
    id: String(row.id),
    clientId: row.clientId ?? null,
    baseId: row.baseId ?? null,
    clientName: String(row.clientName),
    originPostalCode: row.originPostalCode ?? null,
    originAddress: String(row.originAddress),
    originStreet: row.originStreet ?? null,
    originNumber: row.originNumber ?? null,
    originNeighborhood: row.originNeighborhood ?? null,
    originCity: row.originCity ?? null,
    originState: row.originState ?? null,
    originComplement: row.originComplement ?? null,
    originLat: row.originLat ?? null,
    originLng: row.originLng ?? null,
    destinationPostalCode: row.destinationPostalCode ?? null,
    destinationAddress: String(row.destinationAddress),
    destinationStreet: row.destinationStreet ?? null,
    destinationNumber: row.destinationNumber ?? null,
    destinationNeighborhood: row.destinationNeighborhood ?? null,
    destinationCity: row.destinationCity ?? null,
    destinationState: row.destinationState ?? null,
    destinationComplement: row.destinationComplement ?? null,
    destinationLat: row.destinationLat ?? null,
    destinationLng: row.destinationLng ?? null,
    driverId: row.driverId ?? null,
    createdByUserId: row.createdByUserId ?? null,
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

function mapClient(row: Record<string, any>): Client {
  return {
    id: String(row.id),
    name: String(row.name),
    document: row.document ?? null,
    phone: row.phone ?? null,
    email: row.email ?? null,
    notes: row.notes ?? null,
    createdAt: toDate(row.createdAt)!,
    updatedAt: toDate(row.updatedAt)!,
  };
}

function mapClientBase(row: Record<string, any>): ClientBase {
  return {
    id: String(row.id),
    clientId: String(row.clientId),
    name: String(row.name),
    postalCode: row.postalCode ?? null,
    street: String(row.street),
    number: row.number ?? null,
    neighborhood: row.neighborhood ?? null,
    city: String(row.city),
    state: String(row.state),
    complement: row.complement ?? null,
    reference: row.reference ?? null,
    isDefault: Boolean(row.isDefault),
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
    tenantId: input.tenantId ?? null,
    name: input.name ?? null,
    email: input.email ?? null,
    loginMethod: input.loginMethod ?? "supabase",
    role: input.role ?? "motorista",
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

export async function getUsers(accessToken?: string | null) {
  const db = clientFor(accessToken);
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
  id: string,
  updates: Partial<
    Pick<InsertUser, "name" | "email" | "loginMethod" | "tenantId"> & { role: User["role"] }
  >,
  accessToken?: string | null
) {
  const db = clientFor(accessToken);
  const { error } = await db
    .from("users")
    .update(
      removeUndefined({
        tenantId: updates.tenantId ?? undefined,
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
  tenantId?: string | null;
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
    tenantId: input.tenantId ?? null,
    name: input.name ?? input.email,
    email: input.email,
    loginMethod: "supabase",
    role: input.role ?? "motorista",
  });

  return getUserByAuthUserId(data.user.id);
}

export async function deleteUserAccount(id: string, accessToken?: string | null) {
  const db = clientFor(accessToken);
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

export async function getTenantById(id: string) {
  const db = createSupabaseAdminClient();
  const { data, error } = await db.from("tenants").select("*").eq("id", id).maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapTenant(data) : null;
}

export async function getTenants(accessToken?: string | null) {
  const db = clientFor(accessToken);
  const { data, error } = await db.rpc("list_tenants");

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapTenant);
}

export async function createTenant(input: InsertTenant, accessToken?: string | null) {
  const db = clientFor(accessToken);
  const { data, error } = await db.rpc("create_tenant", {
    p_payload: removeUndefined({
      ...input,
      paymentDueAt: toIsoString(input.paymentDueAt),
      createdAt: toIsoString(input.createdAt),
      updatedAt: toIsoString(input.updatedAt),
    }),
  });

  if (error) {
    throw error;
  }

  const tenant = Array.isArray(data) ? data[0] : data;
  return tenant ? mapTenant(tenant) : null;
}

export async function updateTenant(id: string, updates: Partial<InsertTenant>, accessToken?: string | null) {
  const db = clientFor(accessToken);
  const { error } = await db.rpc("update_tenant", {
    p_id: id,
    p_payload: removeUndefined({
      ...updates,
      paymentDueAt: toIsoString(updates.paymentDueAt),
      updatedAt: new Date().toISOString(),
    }),
  });

  if (error) {
    throw error;
  }
}

export async function deleteTenant(id: string, accessToken?: string | null) {
  const db = clientFor(accessToken);
  const { error } = await db.rpc("delete_tenant", { p_id: id });

  if (error) {
    throw error;
  }
}

export async function getClients(accessToken?: string | null) {
  const db = clientFor(accessToken);
  const { data, error } = await db
    .from("clients")
    .select("*")
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapClient);
}

export async function createClientRecord(input: InsertClient, accessToken?: string | null) {
  const db = clientFor(accessToken);
  const { data, error } = await db
    .from("clients")
    .insert(
      removeUndefined({
        ...input,
        createdAt: toIsoString(input.createdAt),
        updatedAt: toIsoString(input.updatedAt),
      })
    )
    .select("*")
    .single();
  if (error) throw error;
  return data ? mapClient(data) : null;
}

export async function updateClientRecord(id: string, updates: Partial<InsertClient>, accessToken?: string | null) {
  const db = clientFor(accessToken);
  const { error } = await db
    .from("clients")
    .update(removeUndefined({ ...updates, updatedAt: new Date().toISOString() }))
    .eq("id", id);
  if (error) throw error;
}

export async function deleteClientRecord(id: string, accessToken?: string | null) {
  const db = clientFor(accessToken);
  const { error } = await db.from("clients").delete().eq("id", id);
  if (error) throw error;
}

export async function getClientBases(clientId?: string, accessToken?: string | null) {
  const db = clientFor(accessToken);
  let query = db.from("client_bases").select("*");
  if (clientId) query = query.eq("clientId", clientId);
  const { data, error } = await query.order("isDefault", { ascending: false }).order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapClientBase);
}

export async function createClientBase(input: InsertClientBase, accessToken?: string | null) {
  const db = clientFor(accessToken);
  const { data, error } = await db
    .from("client_bases")
    .insert(
      removeUndefined({
        ...input,
        isDefault: input.isDefault ?? false,
        createdAt: toIsoString(input.createdAt),
        updatedAt: toIsoString(input.updatedAt),
      })
    )
    .select("*")
    .single();
  if (error) throw error;
  return data ? mapClientBase(data) : null;
}

export async function updateClientBase(id: string, updates: Partial<InsertClientBase>, accessToken?: string | null) {
  const db = clientFor(accessToken);
  const { error } = await db
    .from("client_bases")
    .update(removeUndefined({ ...updates, updatedAt: new Date().toISOString() }))
    .eq("id", id);
  if (error) throw error;
}

export async function deleteClientBase(id: string, accessToken?: string | null) {
  const db = clientFor(accessToken);
  const { error } = await db.from("client_bases").delete().eq("id", id);
  if (error) throw error;
}

export async function getDeliveries(
  filters?: {
    status?: string;
    driverId?: string;
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

export async function getDeliveryById(id: string, accessToken?: string | null) {
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
        clientId: delivery.clientId ?? null,
        baseId: delivery.baseId ?? null,
        originPostalCode: delivery.originPostalCode ?? null,
        originStreet: delivery.originStreet ?? null,
        originNumber: delivery.originNumber ?? null,
        originNeighborhood: delivery.originNeighborhood ?? null,
        originCity: delivery.originCity ?? null,
        originState: delivery.originState ?? null,
        originComplement: delivery.originComplement ?? null,
        scheduledAt: toIsoString(delivery.scheduledAt),
        createdAt: toIsoString(delivery.createdAt),
        updatedAt: toIsoString(delivery.updatedAt),
        destinationPostalCode: delivery.destinationPostalCode ?? null,
        destinationStreet: delivery.destinationStreet ?? null,
        destinationNumber: delivery.destinationNumber ?? null,
        destinationNeighborhood: delivery.destinationNeighborhood ?? null,
        destinationCity: delivery.destinationCity ?? null,
        destinationState: delivery.destinationState ?? null,
        destinationComplement: delivery.destinationComplement ?? null,
        routeOrder: delivery.routeOrder ?? null,
      })
    )
    .select("*")
    .single();

  if (error) throw error;
  return data ? mapDelivery(data) : null;
}

export async function updateDelivery(
  id: string,
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
        clientId: updates.clientId ?? undefined,
        baseId: updates.baseId ?? undefined,
        originPostalCode: updates.originPostalCode ?? undefined,
        originStreet: updates.originStreet ?? undefined,
        originNumber: updates.originNumber ?? undefined,
        originNeighborhood: updates.originNeighborhood ?? undefined,
        originCity: updates.originCity ?? undefined,
        originState: updates.originState ?? undefined,
        originComplement: updates.originComplement ?? undefined,
        routeOrder: normalizedRouteOrder,
        scheduledAt: toIsoString(updates.scheduledAt),
        destinationPostalCode: updates.destinationPostalCode ?? undefined,
        destinationStreet: updates.destinationStreet ?? undefined,
        destinationNumber: updates.destinationNumber ?? undefined,
        destinationNeighborhood: updates.destinationNeighborhood ?? undefined,
        destinationCity: updates.destinationCity ?? undefined,
        destinationState: updates.destinationState ?? undefined,
        destinationComplement: updates.destinationComplement ?? undefined,
        updatedAt: new Date().toISOString(),
      })
    )
    .eq("id", id);

  if (error) throw error;
}

export async function deleteDelivery(id: string, accessToken?: string | null) {
  const db = clientFor(accessToken);
  const { error } = await db.from("deliveries").delete().eq("id", id);
  if (error) throw error;
}

export async function updateDeliveriesOrder(
  updates: Array<{ id: string; routeOrder: number; driverId?: string | null; scheduledAt?: Date | string | null }>,
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

export async function getDriverById(id: string, accessToken?: string | null) {
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
  id: string,
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

export async function deleteDriver(id: string, accessToken?: string | null) {
  const db = clientFor(accessToken);
  const { error } = await db.from("drivers").delete().eq("id", id);
  if (error) throw error;
}

export async function getDriverVehicles(driverId?: string, accessToken?: string | null) {
  const db = clientFor(accessToken);
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
  id: string,
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

export async function deleteDriverVehicle(id: string, accessToken?: string | null) {
  const db = clientFor(accessToken);
  const { error } = await db.from("driver_vehicles").delete().eq("id", id);
  if (error) throw error;
}
