import { createClient } from "npm:@supabase/supabase-js@2.45.4";

// Account management for the excavator ledger. Logins use a mobile number;
// each number maps to an internal email so Supabase Auth can store it.
const URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(URL, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });
const EMAIL_DOMAIN = "phone.veku-hisab.app";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
}
function normPhone(p: unknown): string | null {
  const bn = "০১২৩৪৫৬৭৮৯";
  let s = String(p ?? "").replace(/[০-৯]/g, (d) => String(bn.indexOf(d))).replace(/\D/g, "");
  if (s.startsWith("880")) s = s.slice(2);
  if (s.length === 10 && s.startsWith("1")) s = "0" + s;
  return /^01\d{9}$/.test(s) ? s : null;
}
const emailFor = (phone: string) => `${phone}@${EMAIL_DOMAIN}`;

async function callerIsOwner(req: Request) {
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) return null;
  const { data: o } = await admin.from("app_owner").select("user_id").eq("user_id", data.user.id).maybeSingle();
  return o ? data.user : null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);
  let body: any;
  try { body = await req.json(); } catch { return json({ error: "bad_json" }, 400); }
  const action = body?.action;
  try {
    if (action === "setup") {
      const { count } = await admin.from("app_owner").select("*", { count: "exact", head: true });
      if ((count ?? 0) > 0) return json({ error: "owner_exists" }, 409);
      const { data: setup } = await admin.from("app_setup").select("code").eq("id", 1).maybeSingle();
      if (!setup || String(body.code || "").trim().toUpperCase() !== String(setup.code).toUpperCase()) return json({ error: "bad_code" }, 403);
      const phone = normPhone(body.phone);
      if (!phone) return json({ error: "bad_phone" }, 400);
      const pw = String(body.password || "");
      if (pw.length < 6) return json({ error: "short_password" }, 400);
      const { data: u, error } = await admin.auth.admin.createUser({
        email: emailFor(phone), password: pw, email_confirm: true,
        user_metadata: { name: String(body.name || "").slice(0, 80), phone },
      });
      if (error || !u?.user) return json({ error: "create_failed", message: error?.message }, 400);
      const { error: e2 } = await admin.from("app_owner").insert({ user_id: u.user.id });
      if (e2) { await admin.auth.admin.deleteUser(u.user.id); return json({ error: "owner_failed", message: e2.message }, 500); }
      await admin.from("app_setup").delete().eq("id", 1);
      return json({ ok: true, phone });
    }

    const owner = await callerIsOwner(req);
    if (!owner) return json({ error: "not_owner" }, 403);

    if (action === "create_login") {
      const phone = normPhone(body.phone);
      if (!phone) return json({ error: "bad_phone" }, 400);
      const pw = String(body.password || "");
      if (pw.length < 6) return json({ error: "short_password" }, 400);
      let driverId: string | null = body.driver_id || null;
      if (driverId) {
        const { data: d } = await admin.from("drivers").select("id,user_id").eq("id", driverId).maybeSingle();
        if (!d) return json({ error: "no_driver" }, 404);
        if (d.user_id) return json({ error: "has_login" }, 409);
      }
      const { data: u, error } = await admin.auth.admin.createUser({
        email: emailFor(phone), password: pw, email_confirm: true, user_metadata: { phone },
      });
      if (error || !u?.user) {
        const taken = /already|registered|exists/i.test(error?.message || "");
        return json({ error: taken ? "phone_taken" : "create_failed", message: error?.message }, 400);
      }
      if (driverId) {
        const { error: e } = await admin.from("drivers").update({ user_id: u.user.id, phone }).eq("id", driverId);
        if (e) { await admin.auth.admin.deleteUser(u.user.id); return json({ error: "link_failed", message: e.message }, 500); }
      } else {
        const rt = ["hour", "day", "manual"].includes(body.rate_type) ? body.rate_type : "hour";
        const { data: d, error: e } = await admin.from("drivers").insert({
          name: String(body.name || "").trim().slice(0, 80) || phone, phone, rate_type: rt,
          rate: Number(body.rate) || 0, user_id: u.user.id,
        }).select("id").single();
        if (e || !d) { await admin.auth.admin.deleteUser(u.user.id); return json({ error: "insert_failed", message: e?.message }, 500); }
        driverId = d.id;
      }
      return json({ ok: true, driver_id: driverId, phone });
    }

    if (action === "set_password") {
      const pw = String(body.password || "");
      if (pw.length < 6) return json({ error: "short_password" }, 400);
      const { data: d } = await admin.from("drivers").select("user_id").eq("id", body.driver_id).maybeSingle();
      if (!d?.user_id) return json({ error: "no_login" }, 404);
      const { error } = await admin.auth.admin.updateUserById(d.user_id, { password: pw });
      if (error) return json({ error: "update_failed", message: error.message }, 400);
      return json({ ok: true });
    }

    if (action === "remove_login") {
      const { data: d } = await admin.from("drivers").select("user_id").eq("id", body.driver_id).maybeSingle();
      if (!d?.user_id) return json({ ok: true });
      await admin.from("drivers").update({ user_id: null }).eq("id", body.driver_id);
      await admin.auth.admin.deleteUser(d.user_id);
      return json({ ok: true });
    }

    return json({ error: "unknown_action" }, 400);
  } catch (e) {
    return json({ error: "server", message: String((e as Error)?.message || e) }, 500);
  }
});
