import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Maximale score die fysiek haalbaar is gegeven de pipe-interval en speed.
// Scores boven dit limiet worden als vals beschouwd.
const MAX_PLAUSIBLE_SCORE = 9999;
const LEADERBOARD_SIZE = 10;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "https://franstastisch.nl",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: "Server configuratiefout." }, 500);
  }

  const db = createClient(supabaseUrl, serviceRoleKey);

  // ── GET: top 10 ophalen ──────────────────────────────────
  if (req.method === "GET") {
    const { data, error } = await db
      .from("flappy_scores")
      .select("naam, score, created_at")
      .order("score", { ascending: false })
      .limit(LEADERBOARD_SIZE);

    if (error) return jsonResponse({ error: "Laden mislukt." }, 500);
    return jsonResponse({ data });
  }

  // ── POST: score insturen ─────────────────────────────────
  if (req.method === "POST") {
    let body: { naam?: unknown; score?: unknown; token?: unknown };
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "Ongeldig verzoek." }, 400);
    }

    // Turnstile verificatie (OWASP A07 – bot-bescherming)
    const turnstileSecret = Deno.env.get("TURNSTILE_SECRET");
    if (!turnstileSecret) {
      return jsonResponse({ error: "Server configuratiefout." }, 500);
    }
    const tsToken = String(body.token ?? "");
    if (!tsToken) {
      return jsonResponse({ error: "Beveiligingscheck vereist." }, 400);
    }
    const tsRes = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: turnstileSecret, response: tsToken }),
    });
    const tsData = await tsRes.json().catch(() => ({ success: false }));
    if (!tsData.success) {
      return jsonResponse({ error: "Beveiligingscheck mislukt. Probeer opnieuw." }, 403);
    }

    const naamStr = String(body.naam ?? "").trim();
    const scoreNum = Number(body.score);

    // Server-side validatie: nooit client-data vertrouwen (OWASP A03)
    if (!naamStr || naamStr.length < 1 || naamStr.length > 30) {
      return jsonResponse({ error: "Naam moet tussen 1 en 30 tekens zijn." }, 400);
    }

    if (!Number.isInteger(scoreNum) || scoreNum < 1 || scoreNum > MAX_PLAUSIBLE_SCORE) {
      return jsonResponse({ error: "Ongeldige score." }, 400);
    }

    // Rate limit: max 5 inzendingen per naam per uur
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count, error: rateError } = await db
      .from("flappy_scores")
      .select("id", { count: "exact", head: true })
      .eq("naam", naamStr)
      .gte("created_at", since);

    if (rateError) return jsonResponse({ error: "Rate-limit controle mislukt." }, 500);
    if ((count ?? 0) >= 5) {
      return jsonResponse({ error: "Limiet bereikt. Probeer later opnieuw." }, 429);
    }

    // Sla de score op — service role slaat RLS over, identiteit is al gevalideerd.
    const { error: insertError } = await db
      .from("flappy_scores")
      .insert({ naam: naamStr, score: scoreNum });

    if (insertError) return jsonResponse({ error: "Opslaan mislukt." }, 500);
    return jsonResponse({ ok: true });
  }

  return jsonResponse({ error: "Method not allowed." }, 405);
});
