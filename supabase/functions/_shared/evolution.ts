// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export const EVOLUTION_URL = Deno.env.get("EVOLUTION_URL")!;
export const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY")!;
export const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
export const SUPABASE_ANON_KEY =
  Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
export const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get(
  "SUPABASE_SERVICE_ROLE_KEY",
)!;

export async function getUser(req: Request) {
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) return { user: null, token: "" };
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data } = await client.auth.getUser(token);
  return { user: data.user, token };
}

export function adminClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function instanceName(userId: string) {
  return `instancia_${userId.replace(/-/g, "")}`;
}

export async function evoFetch(
  path: string,
  init: RequestInit = {},
): Promise<{ ok: boolean; status: number; data: any }> {
  const res = await fetch(`${EVOLUTION_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      apikey: EVOLUTION_API_KEY,
      ...(init.headers ?? {}),
    },
  });
  let data: any = null;
  const text = await res.text();
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { ok: res.ok, status: res.status, data };
}
