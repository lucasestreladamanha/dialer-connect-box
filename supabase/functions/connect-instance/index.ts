import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { evoFetch, getUser, instanceName } from "../_shared/evolution.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { user } = await getUser(req);
    if (!user) return jsonResponse({ error: "Unauthorized" }, 401);
    const name = instanceName(user.id);
    const res = await evoFetch(`/instance/connect/${name}`);
    if (!res.ok) return jsonResponse({ error: "connect_failed", detail: res.data }, 500);
    // Evolution returns { code, base64, pairingCode, count } or similar.
    const d = res.data ?? {};
    const qr = d.base64 ?? d.qrcode?.base64 ?? d.code ?? null;
    return jsonResponse({ qr, raw: d });
  } catch (e) {
    return jsonResponse({ error: String(e) }, 500);
  }
});
