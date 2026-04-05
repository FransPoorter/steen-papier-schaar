import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const TURNSTILE_HOSTNAME = "franstastisch.nl";
const NAME_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 uur
const NAME_RATE_LIMIT_MAX = 3;
const DUPLICATE_WINDOW_MS = 30 * 24 * 60 * 60 * 1000; // 30 dagen
const URL_PATTERN = /(https?:\/\/|www\.)/i;
const VERDACHTE_TERMEN = [
  "viagra",
  "casino",
  "crypto",
  "loan",
  "escort",
  "bitcoin",
  "telegram",
  "whatsapp"
];

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "https://franstastisch.nl",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function isoNowMinus(ms: number): string {
  return new Date(Date.now() - ms).toISOString();
}

function bevatVerdachteInhoud(tekst: string): boolean {
  const normaal = tekst.toLowerCase();
  return URL_PATTERN.test(tekst) || VERDACHTE_TERMEN.some((term) => normaal.includes(term));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  let body: {
    name?: unknown;
    message?: unknown;
    rating?: unknown;
    token?: unknown;
    website?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Ongeldig verzoek." }, 400);
  }

  const { name, message, rating, token, website } = body;

  if (!name || !message || !rating || !token) {
    return jsonResponse({ error: "Ontbrekende velden." }, 400);
  }

  // Extra server-side honeypot voor directe API-aanroepen.
  if (String(website ?? "").trim() !== "") {
    return jsonResponse({ error: "Ongeldige aanvraag." }, 400);
  }

  const naamStr = String(name).trim();
  const berichtStr = String(message).trim();
  const ratingNum = Number(rating);

  if (!naamStr || naamStr.length < 2 || naamStr.length > 60) {
    return jsonResponse({ error: "Naam is ongeldig (max 60 tekens)." }, 400);
  }

  if (!berichtStr || berichtStr.length < 8 || berichtStr.length > 500) {
    return jsonResponse({ error: "Bericht is ongeldig (max 500 tekens)." }, 400);
  }

  if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
    return jsonResponse({ error: "Beoordeling moet tussen 1 en 5 liggen." }, 400);
  }

  if (bevatVerdachteInhoud(naamStr) || bevatVerdachteInhoud(berichtStr)) {
    return jsonResponse({ error: "Bericht geweigerd door spamfilter." }, 400);
  }

  // Verify Cloudflare Turnstile token
  const turnstileSecret = Deno.env.get("TURNSTILE_SECRET");
  if (!turnstileSecret) {
    return jsonResponse({ error: "Server configuratiefout." }, 500);
  }

  const forwardedFor = req.headers.get("x-forwarded-for") || "";
  const remoteIp = forwardedFor.split(",")[0].trim() || req.headers.get("cf-connecting-ip") || "";

  const verifyRes = await fetch(
    TURNSTILE_VERIFY_URL,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret: turnstileSecret,
        response: String(token),
        remoteip: remoteIp,
      }),
    }
  );

  if (!verifyRes.ok) {
    return jsonResponse({ error: "Captcha-service tijdelijk niet beschikbaar." }, 502);
  }

  const verifyData = await verifyRes.json() as {
    success?: boolean;
    hostname?: string;
  };

  if (!verifyData.success) {
    return jsonResponse(
      { error: "Captcha verificatie mislukt. Ververs de pagina en probeer opnieuw." },
      403
    );
  }

  if (verifyData.hostname && verifyData.hostname !== TURNSTILE_HOSTNAME) {
    return jsonResponse({ error: "Captcha domeincontrole mislukt." }, 403);
  }

  // Insert with service role key (bypasses RLS, never exposed to client)
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: "Server configuratiefout." }, 500);
  }

  const supabase = createClient(
    supabaseUrl,
    serviceRoleKey
  );

  const vanafEenUurGeleden = isoNowMinus(NAME_RATE_LIMIT_WINDOW_MS);
  const { count: recentByName, error: rateLimitError } = await supabase
    .from("reviews")
    .select("id", { count: "exact", head: true })
    .eq("name", naamStr)
    .gte("created_at", vanafEenUurGeleden);

  if (rateLimitError) {
    return jsonResponse({ error: "Rate-limit controle mislukt." }, 500);
  }

  if ((recentByName ?? 0) >= NAME_RATE_LIMIT_MAX) {
    return jsonResponse(
      { error: "Je hebt het limiet bereikt. Probeer het later opnieuw." },
      429
    );
  }

  const vanafDertigDagenGeleden = isoNowMinus(DUPLICATE_WINDOW_MS);
  const { count: duplicateMessageCount, error: duplicateError } = await supabase
    .from("reviews")
    .select("id", { count: "exact", head: true })
    .eq("message", berichtStr)
    .gte("created_at", vanafDertigDagenGeleden);

  if (duplicateError) {
    return jsonResponse({ error: "Duplicaatcontrole mislukt." }, 500);
  }

  if ((duplicateMessageCount ?? 0) > 0) {
    return jsonResponse(
      { error: "Dit bericht is al eerder ingestuurd." },
      409
    );
  }

  const { error } = await supabase.from("reviews").insert({
    name: naamStr,
    message: berichtStr,
    rating: ratingNum,
    is_approved: false,
  });

  if (error) {
    return jsonResponse({ error: "Opslaan mislukt. Probeer later opnieuw." }, 500);
  }

  return jsonResponse({ ok: true });
});
