import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getTestAccount, getTestPassword } from "./test-account-catalog.ts";

export type ServiceClient = SupabaseClient;

export function createServiceClient(): ServiceClient {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export async function requireSupervisor(request: Request, serviceClient: ServiceClient): Promise<string> {
  const authorization = request.headers.get("Authorization");
  if (!authorization) throw new Error("Unauthorized: Supervisor session required");
  const token = authorization.replace(/^Bearer\s+/i, "");
  const { data, error } = await serviceClient.auth.getUser(token);
  if (error || !data.user) throw new Error("Unauthorized: invalid Supervisor session");
  const { data: profile, error: profileError } = await serviceClient
    .from("platform_admin_profiles")
    .select("id, admin_tier, is_supervisor")
    .eq("user_id", data.user.id)
    .maybeSingle();
  if (profileError || !profile || !(profile.is_supervisor || profile.admin_tier === "supervisor")) {
    throw new Error("Unauthorized: Supervisor role required");
  }
  return data.user.id;
}

export async function issueTestSession(serviceClient: ServiceClient, email: string) {
  const account = getTestAccount(email);
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? "";
  if (!anonKey) throw new Error("Anonymous Supabase key is not configured");
  const authClient = createClient(Deno.env.get("SUPABASE_URL") ?? "", anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await authClient.auth.signInWithPassword({
    email,
    password: getTestPassword(email),
  });
  if (error || !data.session || !data.user) {
    throw new Error(`Normal password sign-in failed for ${email}: ${error?.message ?? "no session"}`);
  }
  return {
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    expiresAt: data.session.expires_at,
    user: { id: data.user.id, email: account.email, role: account.roleLabel },
  };
}

export function errorStatus(error: unknown): number {
  return error instanceof Error && error.message.startsWith("Unauthorized:") ? 401 : 500;
}

export async function requireServiceRole(serviceClient: ServiceClient): Promise<void> {
  const { error } = await serviceClient.auth.admin.listUsers({ page: 1, perPage: 1 });
  if (error) throw new Error(`Service-role access is unavailable: ${error.message}`);
}
