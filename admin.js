const SUPABASE_URL = "https://hizdsaynfaqqmulmitql.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpemRzYXluZmFxcW11bG1pdHFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyMzY0NDIsImV4cCI6MjA5MDgxMjQ0Mn0.3BtB_5kmg6JsBrAgxd9cAcRRMdDz5Ppu5dJZVgdwNjA";

let adminClient;
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

function toonLoginStatus(tekst, type) {
  const el = document.getElementById("loginStatus");
  el.textContent = tekst;
  el.className = `admin-status admin-status--${type}`;
}

// ── Schermwisselaars ────────────────────────────────────────
function toonAdminPanel(user) {
  document.getElementById("adminLogin").hidden = true;
  document.getElementById("adminPanel").hidden = false;
  document.getElementById("adminUser").textContent = user.email;
  laadReviews();
}

function toonLoginScherm() {
  document.getElementById("adminLogin").hidden = false;
  document.getElementById("adminPanel").hidden = true;
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

  const { data, error } = await adminClient
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
  const { error } = await adminClient
    .from("reviews").update({ is_approved: true }).eq("id", id);
  if (!error) laadReviews();
}

async function trekTerug(id) {
  const { error } = await adminClient
    .from("reviews").update({ is_approved: false }).eq("id", id);
  if (!error) laadReviews();
}

async function verwijder(id) {
  if (!confirm("Weet je zeker dat je deze recensie wil verwijderen?")) return;
  const { error } = await adminClient
    .from("reviews").delete().eq("id", id);
  if (!error) laadReviews();
}

// ── Initialisatie ───────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  adminClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Controleer of al ingelogd
  adminClient.auth.getSession().then(({ data }) => {
    if (data.session) {
      toonAdminPanel(data.session.user);
    }
  });

  // Reageer op auth-veranderingen
  adminClient.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_IN" && session) {
      toonAdminPanel(session.user);
    } else if (event === "SIGNED_OUT") {
      toonLoginScherm();
    }
  });

  // Inloggen
  document.getElementById("loginForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;

    toonLoginStatus("Inloggen…", "info");

    const { error } = await adminClient.auth.signInWithPassword({ email, password });

    if (error) {
      toonLoginStatus("Inloggen mislukt. Controleer je gegevens.", "error");
    }
  });

  // Uitloggen
  document.getElementById("logoutBtn").addEventListener("click", async () => {
    await adminClient.auth.signOut();
  });

  // Tabs
  document.getElementById("tabPending").addEventListener("click", () => wisselTabblad("pending"));
  document.getElementById("tabApproved").addEventListener("click", () => wisselTabblad("approved"));
});
