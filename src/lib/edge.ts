import { supabase } from "@/integrations/supabase/client";

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

export async function callEdge<T = unknown>(
  name: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Sessão expirada");
  const res = await fetch(`${FUNCTIONS_URL}/${name}`, {
    method: options.method ?? "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const text = await res.text();
  let parsed: any = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }
  if (!res.ok) {
    const msg = parsed?.error || parsed?.message || `Erro ${res.status}`;
    throw new Error(msg);
  }
  return parsed as T;
}
