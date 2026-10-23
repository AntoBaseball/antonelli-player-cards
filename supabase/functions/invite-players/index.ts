// Coach-only invites. The service role key stays in the function environment.
// Deploy with: supabase functions deploy invite-players
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

type InviteRow = {
  id?: string;
  name?: string;
  team?: string;
  ageGroup?: string;
  age_group?: string;
  position?: string;
  email?: string;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json(405, { error: "POST only." });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return json(500, { error: "Function secrets are missing." });
  }

  const authHeader = req.headers.get("Authorization") || "";
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) return json(401, { error: "Sign in required." });

  const admin = createClient(supabaseUrl, serviceKey);
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .maybeSingle();
  if (!profile || profile.role !== "coach") return json(403, { error: "Coaches only." });

  let payload: { players?: InviteRow[]; redirectTo?: string };
  try {
    payload = await req.json();
  } catch (_err) {
    return json(400, { error: "Send a JSON body." });
  }

  const rows = Array.isArray(payload.players) ? payload.players.slice(0, 200) : [];
  if (!rows.length) return json(400, { error: "Add at least one player." });

  const results = [];
  for (const row of rows) {
    const name = String(row.name || "").trim();
    const email = String(row.email || "").trim().toLowerCase();
    const id = String(row.id || "").trim() || ("player-" + crypto.randomUUID());
    if (!name) {
      results.push({ id, email, invited: false, error: "Name is required." });
      continue;
    }
    const team = String(row.team || "").trim();
    const ageGroup = String(row.ageGroup || row.age_group || "").trim();
    const position = String(row.position || "").trim();

    const { error: playerError } = await admin.from("players").upsert({
      id,
      name,
      team,
      age_group: ageGroup,
      position,
      overall: null,
      tier: null,
      public_card: {},
    }, { onConflict: "id" });
    if (playerError) {
      results.push({ id, email, invited: false, error: playerError.message });
      continue;
    }

    await admin.from("player_private").upsert({
      player_id: id,
    }, { onConflict: "player_id" });

    if (!email) {
      results.push({ id, name, email: "", invited: false, error: "No email, so no invite was sent." });
      continue;
    }

    const { error: accountError } = await admin.from("player_accounts").upsert({
      player_id: id,
      email,
      invited_at: new Date().toISOString(),
    }, { onConflict: "player_id" });
    if (accountError) {
      results.push({ id, email, invited: false, error: accountError.message });
      continue;
    }

    const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { player_id: id, name },
      redirectTo: payload.redirectTo || undefined,
    });
    results.push({
      id,
      name,
      email,
      invited: !inviteError,
      error: inviteError ? inviteError.message : "",
    });
  }

  return json(200, { results });
});
