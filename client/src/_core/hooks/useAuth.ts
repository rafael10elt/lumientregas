import { trpc } from "@/lib/trpc";
import { supabase } from "@/lib/supabase";
import { TRPCClientError } from "@trpc/client";
import { useCallback, useEffect, useMemo, useState } from "react";

type AuthSession = {
  user: {
    id: string;
    openId: string;
    authUserId: string | null;
    tenantId: string | null;
    name: string | null;
    email: string | null;
    loginMethod: string | null;
    status: "active" | "inactive";
    role: "superadmin" | "admin" | "motorista";
  } | null;
  tenant: {
    id: string;
    name: string;
    slug: string;
    status: "active" | "suspended";
    paymentStatus: "ok" | "pending" | "overdue";
  } | null;
  accessBlocked: boolean;
  accessBlockedReason: string | null;
};

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = "/login" } = options ?? {};
  const utils = trpc.useUtils();
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  const meQuery = trpc.auth.me.useQuery(undefined, {
    enabled: sessionReady && Boolean(sessionToken),
    retry: false,
    refetchOnWindowFocus: false,
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      utils.auth.me.setData(undefined, null);
    },
  });

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSessionToken(data.session?.access_token ?? null);
      setSessionReady(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionToken(session?.access_token ?? null);
      setSessionReady(true);
      utils.auth.me.invalidate();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [utils.auth.me]);

  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      await logoutMutation.mutateAsync();
    } catch (error: unknown) {
      if (
        error instanceof TRPCClientError &&
        error.data?.code === "UNAUTHORIZED"
      ) {
        return;
      }
      throw error;
    } finally {
      utils.auth.me.setData(undefined, null);
      await utils.auth.me.invalidate();
    }
  }, [logoutMutation, utils.auth.me]);

  const state = useMemo(() => {
    const session = (meQuery.data ?? null) as AuthSession | null;
    return {
      user: session?.user ?? null,
      tenant: session?.tenant ?? null,
      accessBlocked: session?.accessBlocked ?? false,
      accessBlockedReason: session?.accessBlockedReason ?? null,
      loading: !sessionReady || meQuery.isLoading || logoutMutation.isPending,
      error: meQuery.error ?? logoutMutation.error ?? null,
      isAuthenticated: Boolean(sessionToken),
    };
  }, [
    logoutMutation.error,
    logoutMutation.isPending,
    meQuery.data,
    meQuery.error,
    meQuery.isLoading,
    sessionReady,
    sessionToken,
  ]);

  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (!sessionReady || meQuery.isLoading || logoutMutation.isPending) return;
    if (state.user) return;
    if (typeof window === "undefined") return;
    if (window.location.pathname === redirectPath) return;

    window.location.href = redirectPath;
  }, [
    redirectOnUnauthenticated,
    redirectPath,
    logoutMutation.isPending,
    meQuery.isLoading,
    sessionReady,
    state.user,
  ]);

  return {
    ...state,
    refresh: () => meQuery.refetch(),
    logout,
    sessionToken,
  };
}
