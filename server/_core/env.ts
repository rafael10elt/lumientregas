const supabaseProjectId =
  process.env.SUPABASE_PROJECT_ID ?? process.env.SUPABASE_PROJECT_REF ?? "";

export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  supabaseProjectId,
  supabaseUrl: process.env.SUPABASE_URL ?? (supabaseProjectId ? `https://${supabaseProjectId}.supabase.co` : ""),
  supabaseServiceRoleKey:
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE ?? "",
};
