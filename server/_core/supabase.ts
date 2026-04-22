import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { ENV } from "./env";

function ensureSupabaseUrl() {
  if (!ENV.supabaseUrl) {
    throw new Error("SUPABASE_URL is not configured");
  }
}

export function createSupabaseAnonClient(accessToken?: string | null): SupabaseClient {
  ensureSupabaseUrl();

  return createClient(ENV.supabaseUrl, ENV.supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: accessToken
        ? {
            Authorization: `Bearer ${accessToken}`,
          }
        : undefined,
    },
  });
}

export function createSupabaseAdminClient(): SupabaseClient {
  ensureSupabaseUrl();

  return createClient(ENV.supabaseUrl, ENV.supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
