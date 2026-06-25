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
    const res = await evoFetch(`/instance/connectionState/${name}`);
    if (!res.ok) return jsonResponse({ error: "status_failed", detail: res.data }, 500);
    const state = (res.data?.instance?.state ?? res.data?.state ?? "close")
      .toString()
      .toUpperCase();

    let phone: string | null = null;
    if (state === "OPEN") {
      // Try to fetch the connected number from the instance details.
      const info = await evoFetch(`/instance/fetchInstances?instanceName=${name}`);
      if (info.ok) {
        const arr = Array.isArray(info.data) ? info.data : [info.data];
        const me = arr[0];
        phone =
          me?.instance?.owner?.split?.("@")?.[0] ??
          me?.instance?.profileName ??
          me?.owner?.split?.("@")?.[0] ??
          null;
      }
    }

    const admin = adminClient();
    await admin
      .from("whatsapp_sessions")
      .upsert(
        {
          user_id: user.id,
          instance_name: name,
          status: state,
          phone,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );

    return jsonResponse({ status: state, phone });
  } catch (e) {
    return jsonResponse({ error: String(e) }, 500);
  }
});
