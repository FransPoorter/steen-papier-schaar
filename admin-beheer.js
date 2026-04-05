const SUPABASE_URL = "https://hizdsaynfaqqmulmitql.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpemRzYXluZmFxcW11bG1pdHFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyMzY0NDIsImV4cCI6MjA5MDgxMjQ0Mn0.3BtB_5kmg6JsBrAgxd9cAcRRMdDz5Ppu5dJZVgdwNjA";

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

  const goedgekeurd = huidigTabblad === "approved";

  const { data, error } = await beheerClient
    .from("reviews")
    .select("id, name, message, rating, created_at, is_approved")
    .eq("is_approved", goedgekeurd)
    .order("created_at", { ascending: false });

  if (error) {
    container.innerHTML = `<p class="admin-error">Fout bij laden: ${escapeHtml(error.message)}</p>`;
    return;
  }

  const badgeId = goedgekeurd ? "approvedCount" : "pendingCount";
  document.getElementById(badgeId).textContent = (data ?? []).length;

  if (!data || !data.length) {
    container.innerHTML = `<p class="admin-leeg">Geen recensies gevonden.</p>`;
    return;
  }

  container.innerHTML = data.map((r) => `
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
async function keurGoed(id) {
  const { error } = await beheerClient
    .from("reviews").update({ is_approved: true }).eq("id", id);
  if (!error) laadReviews();
}

async function trekTerug(id) {
  const { error } = await beheerClient
    .from("reviews").update({ is_approved: false }).eq("id", id);
  if (!error) laadReviews();
}

async function verwijder(id) {
  if (!confirm("Weet je zeker dat je deze recensie wil verwijderen?")) return;
  const { error } = await beheerClient
    .from("reviews").delete().eq("id", id);
  if (!error) laadReviews();
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
