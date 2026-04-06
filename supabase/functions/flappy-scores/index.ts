import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Maximale score die fysiek haalbaar is gegeven de pipe-interval en speed.
const MAX_PLAUSIBLE_SCORE = 9999;
const LEADERBOARD_SIZE = 10;
// Score-token verloopt na 5 minuten.
const TOKEN_TTL_SECONDS = 300;

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

// ── Score-token helpers (HMAC-SHA256) ────────────────────────
// De server ondertekent de score op het moment van game over.
// De client kan de inhoud niet aanpassen zonder de handtekening ongeldig te maken.

async function maakScoreToken(score: number, secret: string): Promise<string> {
  const payload = {
    score,
    exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
    nonce: crypto.randomUUID(),
  };
  const encoder = new TextEncoder();
  const payloadB64 = btoa(JSON.stringify(payload));
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payloadB64));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)));
  return `${payloadB64}.${sigB64}`;
}

async function verifieerScoreToken(
  token: string,
  secret: string,
): Promise<{ score: number; nonce: string } | null> {
  const dotIdx = token.indexOf(".");
  if (dotIdx === -1) return null;
  const payloadB64 = token.slice(0, dotIdx);
  const sigB64 = token.slice(dotIdx + 1);

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["verify"],
  );

  let sigBytes: Uint8Array;
  try { sigBytes = Uint8Array.from(atob(sigB64), (c) => c.charCodeAt(0)); }
  catch { return null; }

  const valid = await crypto.subtle.verify("HMAC", key, sigBytes, encoder.encode(payloadB64));
  if (!valid) return null;

  let payload: { score?: unknown; exp?: unknown; nonce?: unknown };
  try { payload = JSON.parse(atob(payloadB64)); }
  catch { return null; }

  const exp = Number(payload.exp ?? 0);
  if (Math.floor(Date.now() / 1000) > exp) return null;

  const score = Number(payload.score ?? 0);
  const nonce = String(payload.nonce ?? "");
  if (!Number.isInteger(score) || score < 1 || !nonce) return null;

  return { score, nonce };
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

  if (req.method === "POST") {
    const action = new URL(req.url).searchParams.get("action");

    // ── POST ?action=gameover: onderteken de score ────────
    // Wordt automatisch aangeroepen bij game over in de browser.
    // Geeft een gesignde token terug die de score vastzet.
    if (action === "gameover") {
      let body: { score?: unknown };
      try { body = await req.json(); }
      catch { return jsonResponse({ error: "Ongeldig verzoek." }, 400); }

      const scoreNum = Number(body.score ?? 0);
      if (!Number.isInteger(scoreNum) || scoreNum < 1 || scoreNum > MAX_PLAUSIBLE_SCORE) {
        return jsonResponse({ error: "Ongeldige score." }, 400);
      }

      const hmacSecret = Deno.env.get("SCORE_HMAC_SECRET");
      if (!hmacSecret) return jsonResponse({ error: "Server configuratiefout." }, 500);

      const token = await maakScoreToken(scoreNum, hmacSecret);
      return jsonResponse({ token });
    }

    // ── POST: naam + score-token + Turnstile insturen ─────
    let body: { naam?: unknown; scoreToken?: unknown; token?: unknown };
    try { body = await req.json(); }
    catch { return jsonResponse({ error: "Ongeldig verzoek." }, 400); }

    // 1. Turnstile — bot-bescherming (OWASP A07)
    const turnstileSecret = Deno.env.get("TURNSTILE_SECRET");
    if (!turnstileSecret) return jsonResponse({ error: "Server configuratiefout." }, 500);
    const tsToken = String(body.token ?? "");
    if (!tsToken) return jsonResponse({ error: "Beveiligingscheck vereist." }, 400);

    const tsRes = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: turnstileSecret, response: tsToken }),
    });
    const tsData = await tsRes.json().catch(() => ({ success: false }));
    if (!tsData.success) {
      return jsonResponse({ error: "Beveiligingscheck mislukt. Probeer opnieuw." }, 403);
    }

    // 2. Score-token — score is door de server vastgelegd bij game over (OWASP A03)
    const hmacSecret = Deno.env.get("SCORE_HMAC_SECRET");
    if (!hmacSecret) return jsonResponse({ error: "Server configuratiefout." }, 500);
    const scoreToken = String(body.scoreToken ?? "");
    if (!scoreToken) return jsonResponse({ error: "Geen score-token. Speel het spel opnieuw." }, 400);

    const verified = await verifieerScoreToken(scoreToken, hmacSecret);
    if (!verified) {
      return jsonResponse({ error: "Ongeldig of verlopen score-token. Speel opnieuw." }, 403);
    }
    // Score komt UIT de token — client-waarde wordt genegeerd
    const { score: scoreNum, nonce } = verified;

    // 3. Naam valideren
    const naamStr = String(body.naam ?? "").trim();
    if (!naamStr || naamStr.length < 1 || naamStr.length > 30) {
      return jsonResponse({ error: "Naam moet tussen 1 en 30 tekens zijn." }, 400);
    }

    // 4. Rate limit: max 5 inzendingen per naam per uur
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

    // 5. Opslaan — nonce voorkomt dat dezelfde token twee keer wordt gebruikt
    const { error: insertError } = await db
      .from("flappy_scores")
      .insert({ naam: naamStr, score: scoreNum, nonce });

    if (insertError?.code === "23505") {
      return jsonResponse({ error: "Deze score is al ingezonden." }, 409);
    }
    if (insertError) return jsonResponse({ error: "Opslaan mislukt." }, 500);
    return jsonResponse({ ok: true });
  }

  return jsonResponse({ error: "Method not allowed." }, 405);
});
