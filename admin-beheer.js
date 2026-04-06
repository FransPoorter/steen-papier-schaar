const SUPABASE_URL = "https://hizdsaynfaqqmulmitql.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpemRzYXluZmFxcW11bG1pdHFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyMzY0NDIsImV4cCI6MjA5MDgxMjQ0Mn0.3BtB_5kmg6JsBrAgxd9cAcRRMdDz5Ppu5dJZVgdwNjA";
// Admin-acties verlopen via een Edge Function — nooit via directe database-aanroepen vanuit de browser.
const ADMIN_EDGE_URL = `${SUPABASE_URL}/functions/v1/admin-reviews`;

let beheerClient;
let huidigTabblad = "pending";

// ── Hulpfuncties ────────────────────────────────────────────
function escapeHtml(waarde) {
  return String(waarde).replace(/[&<>"']/g, (teken) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[teken]);
}

function maakSterren(rating) {
  const r = Math.max(1, Math.min(5, Number(rating) || 0));
  return "★".repeat(r) + "☆".repeat(5 - r);
}

function formatteerDatum(waarde) {
  const datum = new Date(waarde);
  if (Number.isNaN(datum.getTime())) return "Onbekend";
  return new Intl.DateTimeFormat("nl-NL", {
    day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit"
  }).format(datum);
}

// ── Auth helpers ────────────────────────────────────────────
// Haalt het JWT access token op uit de actieve Supabase sessie.
// Dit token wordt bij elke admin-aanroep server-side gevalideerd via getUser().
async function getAccessToken() {
  const { data } = await beheerClient.auth.getSession();
  return data?.session?.access_token || null;
}

// Centrale fetch naar de admin Edge Function.
// Alle database-operaties verlopen server-side — de browser doet nooit directe DB-aanroepen.
// CSRF is niet mogelijk: cross-site requests kunnen geen custom Authorization-header meesturen,
// in tegenstelling tot cookies die automatisch worden meegestuurd.
async function adminFetch(method, params = {}) {
  const token = await getAccessToken();
  if (!token) {
    window.location.replace("/admin");
    return null;
  }

  let url = ADMIN_EDGE_URL;
  const options = {
    method,
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  };

  if (method === "GET") {
    const qs = new URLSearchParams(params).toString();
    if (qs) url += `?${qs}`;
  } else {
    options.body = JSON.stringify(params);
  }

  let res;
  try {
    res = await fetch(url, options);
  } catch {
    return { ok: false, status: 0, data: {} };
  }

  const data = await res.json().catch(() => ({}));

  // Bij 401/403: sessie verlopen of geen toegang → uitloggen en doorsturen
  if (res.status === 401 || res.status === 403) {
    await beheerClient.auth.signOut();
    window.location.replace("/admin");
    return null;
  }

  return { ok: res.ok, status: res.status, data };
}

// ── Tabs ────────────────────────────────────────────────────
function wisselTabblad(tabblad) {
  huidigTabblad = tabblad;
  document.querySelectorAll(".admin-tab").forEach((tab) => {
    tab.classList.toggle("admin-tab--active", tab.dataset.tab === tabblad);
  });
  laadReviews();
}

// ── Reviews laden ───────────────────────────────────────────
async function laadReviews() {
  const container = document.getElementById("reviewsContainer");
  container.innerHTML = `<p class="admin-loading">Laden…</p>`;

  const status = huidigTabblad === "approved" ? "approved" : "pending";
  const result = await adminFetch("GET", { status });

  if (!result) return;

  if (!result.ok) {
    container.innerHTML = `<p class="admin-error">Fout bij laden.</p>`;
    return;
  }

  const reviews = result.data.data ?? [];
  const goedgekeurd = huidigTabblad === "approved";
  const badgeId = goedgekeurd ? "approvedCount" : "pendingCount";
  document.getElementById(badgeId).textContent = reviews.length;

  if (!reviews.length) {
    container.innerHTML = `<p class="admin-leeg">Geen recensies gevonden.</p>`;
    return;
  }

  container.innerHTML = reviews.map((r) => `
    <article class="admin-review-card" data-id="${r.id}">
      <div class="admin-review-top">
        <div class="admin-review-meta">
          <strong>${escapeHtml(r.name)}</strong>
          <span class="admin-review-datum">${formatteerDatum(r.created_at)}</span>
        </div>
        <span class="admin-review-rating">${maakSterren(r.rating)}</span>
      </div>
      <p class="admin-review-bericht">${escapeHtml(r.message)}</p>
      <div class="admin-review-actions">
        ${!goedgekeurd
          ? `<button class="admin-btn admin-btn--approve" onclick="keurGoed(${r.id})">✓ Goedkeuren</button>`
          : `<button class="admin-btn admin-btn--reject" onclick="trekTerug(${r.id})">↩ Intrekken</button>`
        }
        <button class="admin-btn admin-btn--delete" onclick="verwijder(${r.id})">✕ Verwijderen</button>
      </div>
    </article>
  `).join("");
}

// ── Acties ──────────────────────────────────────────────────
// Alle acties worden server-side gevalideerd: de Edge Function controleert
// het JWT, het admin-e-mailadres en de geldigheid van het review-id.
async function keurGoed(id) {
  const result = await adminFetch("POST", { action: "approve", id });
  if (result?.ok) laadReviews();
}

async function trekTerug(id) {
  const result = await adminFetch("POST", { action: "reject", id });
  if (result?.ok) laadReviews();
}

async function verwijder(id) {
  if (!confirm("Weet je zeker dat je deze recensie wil verwijderen?")) return;
  const result = await adminFetch("POST", { action: "delete", id });
  if (result?.ok) laadReviews();
}

// ── Initialisatie ───────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  beheerClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Sessie controleren — niet ingelogd → terug naar login
  const { data } = await beheerClient.auth.getSession();
  if (!data.session) {
    window.location.replace("/admin");
    return;
  }

  // De werkelijke beveiliging zit server-side in de Edge Function (getUser() + email-check).
  // Client ontvangt alleen goedgekeurde antwoorden als admin-toegang geverifieerd is.
  }

  document.getElementById("adminUser").textContent = data.session.user.email;
  laadReviews();

  // Uitloggen
  document.getElementById("logoutBtn").addEventListener("click", async () => {
    await beheerClient.auth.signOut();
    window.location.replace("/admin");
  });

  // Tabs
  document.querySelectorAll(".admin-tab").forEach((tab) => {
    tab.addEventListener("click", () => wisselTabblad(tab.dataset.tab));
  });
});
