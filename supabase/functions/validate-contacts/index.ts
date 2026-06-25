// deno-lint-ignore-file no-explicit-any
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import {
  adminClient,
  evoFetch,
  getUser,
  instanceName,
} from "../_shared/evolution.ts";

const BATCH = 1000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { user } = await getUser(req);
    if (!user) return jsonResponse({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const uploadId: string | undefined = body.upload_id;

    const admin = adminClient();

    // Verify connection
    const { data: session } = await admin
      .from("whatsapp_sessions")
      .select("status, instance_name")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!session || session.status !== "OPEN") {
      return jsonResponse({ error: "whatsapp_not_connected" }, 400);
    }

    const name = instanceName(user.id);

    // Fetch next pending batch (valid_whatsapp IS NULL)
    let query = admin
      .from("contacts")
      .select("id, phone_normalized")
      .eq("user_id", user.id)
      .is("valid_whatsapp", null)
      .not("phone_normalized", "is", null)
      .limit(BATCH);
    if (uploadId) query = query.eq("upload_id", uploadId);

    const { data: pending, error: pErr } = await query;
    if (pErr) return jsonResponse({ error: pErr.message }, 500);

    if (!pending || pending.length === 0) {
      // Mark invalid phones (null normalized) as false for finalization
      let remainingQ = admin
        .from("contacts")
        .update({ valid_whatsapp: false, validated_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .is("valid_whatsapp", null)
        .is("phone_normalized", null);
      if (uploadId) remainingQ = remainingQ.eq("upload_id", uploadId);
      await remainingQ;

      // Compute remaining count
      const { count } = await admin
        .from("contacts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .is("valid_whatsapp", null)
        .eq(uploadId ? "upload_id" : "user_id", uploadId ?? user.id);
      return jsonResponse({ processed: 0, remaining: count ?? 0, done: true });
    }

    const numbers = pending.map((c) => c.phone_normalized!);
    const evo = await evoFetch(`/chat/whatsappNumbers/${name}`, {
      method: "POST",
      body: JSON.stringify({ numbers }),
    });

    if (!evo.ok) {
      return jsonResponse({ error: "evolution_failed", detail: evo.data }, 500);
    }

    // Build a map of normalized -> exists
    const results: any[] = Array.isArray(evo.data) ? evo.data : (evo.data?.numbers ?? []);
    const validMap = new Map<string, boolean>();
    for (const r of results) {
      const num = String(r.number ?? r.jid?.split?.("@")?.[0] ?? "").replace(/\D/g, "");
      const exists = Boolean(r.exists ?? r.isWhatsapp ?? r.isWhatsApp ?? r.status === "valid");
      if (num) validMap.set(num, exists);
    }

    const now = new Date().toISOString();
    // Update one by one batched in groups of 200 via .in() not possible since per-row value differs;
    // use upsert by id.
    const updates = pending.map((c) => ({
      id: c.id,
      user_id: user.id,
      valid_whatsapp: validMap.get(c.phone_normalized!) ?? false,
      validated_at: now,
    }));

    // Split into chunks of 500 for upsert
    for (let i = 0; i < updates.length; i += 500) {
      const chunk = updates.slice(i, i + 500);
      const { error } = await admin
        .from("contacts")
        .upsert(chunk, { onConflict: "id" });
      if (error) console.error("upsert chunk error", error);
    }

    // Remaining
    let countQ = admin
      .from("contacts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .is("valid_whatsapp", null);
    if (uploadId) countQ = countQ.eq("upload_id", uploadId);
    const { count } = await countQ;

    return jsonResponse({
      processed: pending.length,
      remaining: count ?? 0,
      done: (count ?? 0) === 0,
    });
  } catch (e) {
    console.error("validate-contacts error", e);
    return jsonResponse({ error: String(e) }, 500);
  }
});
