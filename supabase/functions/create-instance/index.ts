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

    // Try to create; if already exists, reuse.
    const created = await evoFetch("/instance/create", {
      method: "POST",
      body: JSON.stringify({
        instanceName: name,
        integration: "WHATSAPP-BAILEYS",
        qrcode: true,
      }),
    });

    if (!created.ok && created.status !== 403 && created.status !== 409) {
      // Some Evolution deployments return 400 with "already in use".
      const msg = JSON.stringify(created.data ?? "").toLowerCase();
      if (!msg.includes("already") && !msg.includes("exists") && !msg.includes("in use")) {
        return jsonResponse({ error: "create_failed", detail: created.data }, 500);
      }
    }

    const admin = adminClient();
    await admin
      .from("whatsapp_sessions")
      .upsert(
        {
          user_id: user.id,
          instance_name: name,
          status: "CONNECTING",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );

    return jsonResponse({ instance: name, ok: true });
  } catch (e) {
    console.error("create-instance error", e);
    return jsonResponse({ error: String(e) }, 500);
  }
});
