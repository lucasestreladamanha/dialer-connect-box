import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import {
  adminClient,
  evoFetch,
  getUser,
  instanceName,
} from "../_shared/evolution.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { user } = await getUser(req);
    if (!user) return jsonResponse({ error: "Unauthorized" }, 401);
    const name = instanceName(user.id);
    await evoFetch(`/instance/logout/${name}`, { method: "DELETE" });
    const admin = adminClient();
    await admin
      .from("whatsapp_sessions")
      .update({ status: "CLOSE", phone: null, updated_at: new Date().toISOString() })
      .eq("user_id", user.id);
    return jsonResponse({ ok: true });
  } catch (e) {
    return jsonResponse({ error: String(e) }, 500);
  }
});
