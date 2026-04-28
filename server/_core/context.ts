import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { Tenant, User } from "../../drizzle/schema";
import { ensureUserProfile, getTenantById, getUserByAuthUserId, hasSuperadminUser, updateUser } from "../db";
import { createSupabaseAnonClient } from "./supabase";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  tenant?: Tenant | null;
  accessBlocked?: boolean;
  accessBlockedReason?: string | null;
  accessToken: string | null;
};

function readBearerToken(req: CreateExpressContextOptions["req"]) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice("Bearer ".length).trim();
  return token.length > 0 ? token : null;
}

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  const accessToken = readBearerToken(opts.req);
  let user: User | null = null;
  let tenant: Tenant | null = null;
  let accessBlocked = false;
  let accessBlockedReason: string | null = null;

  if (accessToken) {
    try {
      const supabase = createSupabaseAnonClient(accessToken);
      const { data, error } = await supabase.auth.getUser(accessToken);
      if (!error && data.user?.id) {
        user = (await getUserByAuthUserId(data.user.id)) ?? null;
        const superadminExists = await hasSuperadminUser();
        if (!user) {
          await ensureUserProfile({
            openId: data.user.id,
            authUserId: data.user.id,
            name: data.user.user_metadata?.full_name ?? data.user.user_metadata?.name ?? data.user.email ?? null,
            email: data.user.email ?? null,
            loginMethod: "supabase",
            role: superadminExists ? "motorista" : "superadmin",
          });
          user = (await getUserByAuthUserId(data.user.id)) ?? null;
        } else if (user.role !== "superadmin" && !user.tenantId && !superadminExists) {
          await updateUser(user.id, { role: "superadmin" });
          user = (await getUserByAuthUserId(data.user.id)) ?? null;
        }

        if (user?.tenantId) {
          tenant = await getTenantById(user.tenantId);
        }

        if (user && user.role !== "superadmin") {
          if (!user.tenantId) {
            accessBlocked = true;
            accessBlockedReason = "Usuário sem tenant vinculado.";
          } else if (!tenant) {
            accessBlocked = true;
            accessBlockedReason = "Tenant não encontrado.";
          } else if (tenant.status !== "active") {
            accessBlocked = true;
            accessBlockedReason = "Seu tenant está suspenso. Entre em contato com o administrador do sistema.";
          } else if (tenant.paymentStatus !== "ok") {
            accessBlocked = true;
            accessBlockedReason = "Seu tenant está com pagamento pendente. Entre em contato com o administrador do sistema.";
          }
        }
      }
    } catch {
      user = null;
      tenant = null;
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
    tenant,
    accessBlocked,
    accessBlockedReason,
    accessToken,
  };
}
