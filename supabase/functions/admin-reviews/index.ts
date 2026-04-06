import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Enkel geconfigureerd admin-email heeft toegang.
// Server-side gecontroleerd via Deno.env — niet te omzeilen.
const ADMIN_EMAIL = Deno.env.get("ADMIN_EMAIL");
if (!ADMIN_EMAIL) {
  throw new Error("ADMIN_EMAIL environment variable niet ingesteld");
}

// Authorization header is vereist: tokens worden nooit via URL verstuurd (URL-logging).
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "https://franstastisch.nl",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  // CORS preflight: browsers sturen dit vóór het echte verzoek
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (!["GET", "POST"].includes(req.method)) {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  // Haal Bearer token op uit Authorization header.
  // Bearer tokens in de header zijn niet kwetsbaar voor CSRF-aanvallen —
  // cross-site requests kunnen geen custom headers meesturen (anders dan cookies).
  const authHeader = req.headers.get("authorization") || "";
  if (!authHeader.startsWith("Bearer ")) {
    return jsonResponse({ error: "Niet ingelogd." }, 401);
  }
  const token = authHeader.slice(7);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return jsonResponse({ error: "Server configuratiefout." }, 500);
  }

  // Valideer het JWT server-side via getUser().
  // getUser() verifieert de handtekening en vervaldatum bij Supabase Auth —
  // client-side JWT-checks kunnen worden omzeild en zijn nooit betrouwbaar.
  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: { user }, error: authError } = await authClient.auth.getUser();
  if (authError || !user) {
    return jsonResponse({ error: "Ongeldige of verlopen sessie." }, 401);
  }

  // Tweede laag: controleer dat het account het admin-e-mailadres is.
  // Voorkomt misbruik door andere geauthenticeerde gebruikers (bijv. via signup-lek).
  if (user.email !== ADMIN_EMAIL) {
    return jsonResponse({ error: "Geen toegang." }, 403);
  }

  // Service role client voor DB-operaties: omzeilt RLS omdat identiteit
  // al server-side via getUser() is geverifieerd.
  const db = createClient(supabaseUrl, serviceRoleKey);

  // ── GET: reviews ophalen ─────────────────────────────────
  if (req.method === "GET") {
    const url = new URL(req.url);
    const status = url.searchParams.get("status") || "pending";

    // Server-side validatie van query parameters — nooit vertrouwen op client-input
    if (!["pending", "approved"].includes(status)) {
      return jsonResponse({ error: "Ongeldige status." }, 400);
    }

    const { data, error } = await db
      .from("reviews")
      .select("id, name, message, rating, created_at, is_approved")
      .eq("is_approved", status === "approved")
      .order("created_at", { ascending: false });

    if (error) {
      return jsonResponse({ error: "Laden mislukt." }, 500);
    }

    return jsonResponse({ data });
  }

  // ── POST: actie uitvoeren ────────────────────────────────
  let body: { action?: unknown; id?: unknown };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Ongeldig verzoek." }, 400);
  }

  const { action, id } = body;
  const reviewId = Number(id);

  // Alle input server-side valideren — nooit vertrouwen op client-data (OWASP A03)
  if (!action || !Number.isInteger(reviewId) || reviewId < 1) {
    return jsonResponse({ error: "Ontbrekende of ongeldige velden." }, 400);
  }

  const toegestaneActies = ["approve", "reject", "delete"];
  if (!toegestaneActies.includes(String(action))) {
    return jsonResponse({ error: "Onbekende actie." }, 400);
  }

  if (action === "approve") {
    const { error } = await db.from("reviews").update({ is_approved: true }).eq("id", reviewId);
    if (error) return jsonResponse({ error: "Bijwerken mislukt." }, 500);
    return jsonResponse({ ok: true });
  }

  if (action === "reject") {
    const { error } = await db.from("reviews").update({ is_approved: false }).eq("id", reviewId);
    if (error) return jsonResponse({ error: "Bijwerken mislukt." }, 500);
    return jsonResponse({ ok: true });
  }

  // action === "delete"
  const { error } = await db.from("reviews").delete().eq("id", reviewId);
  if (error) return jsonResponse({ error: "Verwijderen mislukt." }, 500);
  return jsonResponse({ ok: true });
});
