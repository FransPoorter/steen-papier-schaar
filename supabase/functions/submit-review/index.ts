import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "https://franstastisch.nl",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  let body: { name?: unknown; message?: unknown; rating?: unknown; token?: unknown };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Ongeldig verzoek." }, 400);
  }

  const { name, message, rating, token } = body;

  if (!name || !message || !rating || !token) {
    return jsonResponse({ error: "Ontbrekende velden." }, 400);
  }

  const naamStr = String(name).trim();
  const berichtStr = String(message).trim();
  const ratingNum = Number(rating);

  if (!naamStr || naamStr.length > 60) {
    return jsonResponse({ error: "Naam is ongeldig (max 60 tekens)." }, 400);
  }

  if (!berichtStr || berichtStr.length > 500) {
    return jsonResponse({ error: "Bericht is ongeldig (max 500 tekens)." }, 400);
  }

  if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
    return jsonResponse({ error: "Beoordeling moet tussen 1 en 5 liggen." }, 400);
  }

  // Verify Cloudflare Turnstile token
  const turnstileSecret = Deno.env.get("TURNSTILE_SECRET");
  if (!turnstileSecret) {
    return jsonResponse({ error: "Server configuratiefout." }, 500);
  }

  const verifyRes = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret: turnstileSecret,
        response: String(token),
      }),
    }
  );

  const verifyData = await verifyRes.json();
  if (!verifyData.success) {
    return jsonResponse(
      { error: "Captcha verificatie mislukt. Ververs de pagina en probeer opnieuw." },
      403
    );
  }

  // Insert with service role key (bypasses RLS, never exposed to client)
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

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
