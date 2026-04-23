import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { ensureUserProfile, getUserByAuthUserId } from "../db";
import { createSupabaseAnonClient } from "./supabase";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
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

  if (accessToken) {
    try {
      const supabase = createSupabaseAnonClient(accessToken);
      const { data, error } = await supabase.auth.getUser(accessToken);
      if (!error && data.user?.id) {
        user = (await getUserByAuthUserId(data.user.id)) ?? null;
        if (!user) {
          await ensureUserProfile({
            openId: data.user.id,
            authUserId: data.user.id,
            name: data.user.user_metadata?.full_name ?? data.user.user_metadata?.name ?? data.user.email ?? null,
            email: data.user.email ?? null,
            loginMethod: "supabase",
          });
          user = (await getUserByAuthUserId(data.user.id)) ?? null;
        }
      }
    } catch {
      user = null;
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
    accessToken,
  };
}
