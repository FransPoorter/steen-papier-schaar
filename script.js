document.addEventListener("DOMContentLoaded", () => {
  // Fade-in voor alle pagina's
  document.body.classList.add("loaded");

  if (document.body.classList.contains("home")) {
    initialiseerRecensies();
  }
});

const SUPABASE_URL = "https://hizdsaynfaqqmulmitql.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpemRzYXluZmFxcW11bG1pdHFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyMzY0NDIsImV4cCI6MjA5MDgxMjQ0Mn0.3BtB_5kmg6JsBrAgxd9cAcRRMdDz5Ppu5dJZVgdwNjA";
const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/submit-review`;
const REVIEWS_PER_PAGE = 5;

let huidigeReviewPagina = 1;
let totaalReviewPaginas = 1;
let reviewClient;

function heeftReviewElementen() {
  return document.getElementById("reviewForm") && document.getElementById("reviewList");
}

function heeftSupabaseConfig() {
  return (
    SUPABASE_URL !== "VUL_HIER_JE_SUPABASE_URL_IN" &&
    SUPABASE_ANON_KEY !== "VUL_HIER_JE_SUPABASE_ANON_KEY_IN"
  );
}

function escapeHtml(waarde) {
  return String(waarde).replace(/[&<>"']/g, (teken) => {
    const vertaling = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };

    return vertaling[teken];
  });
}

function maakSterren(rating) {
  const veiligeRating = Math.max(1, Math.min(5, Number(rating) || 0));
  return "★".repeat(veiligeRating) + "☆".repeat(5 - veiligeRating);
}

function formatteerReviewDatum(waarde) {
  const datum = new Date(waarde);

  if (Number.isNaN(datum.getTime())) {
    return "Onbekende datum";
  }

  return new Intl.DateTimeFormat("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(datum);
}

function toonReviewStatus(tekst, type = "info") {
  const statusEl = document.getElementById("reviewFormStatus");
  if (!statusEl) return;

  statusEl.textContent = tekst;
  statusEl.className = `form-status form-status--${type}`;
}

function updateReviewPaginering(totaalReviews = 0) {
  const prevBtn = document.getElementById("reviewPrev");
  const nextBtn = document.getElementById("reviewNext");
  const pageInfo = document.getElementById("reviewPageInfo");
  const pagination = document.getElementById("reviewPagination");

  if (!prevBtn || !nextBtn || !pageInfo || !pagination) return;

  if (totaalReviews <= REVIEWS_PER_PAGE) {
    pagination.style.display = "none";
  } else {
    pagination.style.display = "flex";
  }

  pageInfo.textContent = `Pagina ${huidigeReviewPagina} van ${totaalReviewPaginas}`;
  prevBtn.disabled = huidigeReviewPagina <= 1;
  nextBtn.disabled = huidigeReviewPagina >= totaalReviewPaginas;
}

function renderReviews(reviews, melding) {
  const reviewList = document.getElementById("reviewList");
  if (!reviewList) return;

  if (melding) {
    reviewList.innerHTML = `
      <article class="review-card review-card--empty">
        <p>${melding}</p>
      </article>
    `;
    return;
  }

  if (!reviews.length) {
    reviewList.innerHTML = `
      <article class="review-card review-card--empty">
        <p>Er staan nog geen goedgekeurde recensies online.</p>
      </article>
    `;
    return;
  }

  reviewList.innerHTML = reviews
    .map(
      (review) => `
        <article class="review-card">
          <div class="review-card-top">
            <strong>${escapeHtml(review.name)}</strong>
            <span class="review-rating" aria-label="${Number(review.rating) || 0} van de 5 sterren">${maakSterren(review.rating)}</span>
          </div>
          <p>${escapeHtml(review.message)}</p>
          <time datetime="${escapeHtml(review.created_at)}">${formatteerReviewDatum(review.created_at)}</time>
        </article>
      `
    )
    .join("");
}

async function laadRecensies(client, pagina = 1) {
  const start = (pagina - 1) * REVIEWS_PER_PAGE;
  const einde = start + REVIEWS_PER_PAGE - 1;

  const { data, error, count } = await client
    .from("reviews")
    .select("name, message, rating, created_at", { count: "exact" })
    .eq("is_approved", true)
    .order("created_at", { ascending: false })
    .range(start, einde);

  if (error) {
    renderReviews([], "Recensies konden niet worden geladen.");
    updateReviewPaginering(0);
    return;
  }

  const totaalReviews = Number(count) || 0;
  totaalReviewPaginas = Math.max(1, Math.ceil(totaalReviews / REVIEWS_PER_PAGE));
  huidigeReviewPagina = Math.min(Math.max(1, pagina), totaalReviewPaginas);

  // Als de huidige pagina niet meer bestaat (bijv. na verwijderingen), laad opnieuw met geldige pagina.
  if (pagina !== huidigeReviewPagina) {
    await laadRecensies(client, huidigeReviewPagina);
    return;
  }

  updateReviewPaginering(totaalReviews);
  renderReviews(data ?? []);
}

function koppelReviewPaginering() {
  const prevBtn = document.getElementById("reviewPrev");
  const nextBtn = document.getElementById("reviewNext");

  if (!prevBtn || !nextBtn) return;

  prevBtn.addEventListener("click", async () => {
    if (!reviewClient || huidigeReviewPagina <= 1) return;
    await laadRecensies(reviewClient, huidigeReviewPagina - 1);
  });

  nextBtn.addEventListener("click", async () => {
    if (!reviewClient || huidigeReviewPagina >= totaalReviewPaginas) return;
    await laadRecensies(reviewClient, huidigeReviewPagina + 1);
  });
}

const REVIEW_COOLDOWN_MS = 60 * 60 * 1000; // 1 uur per browser
const REVIEW_MIN_FILL_MS = 3000;            // minimaal 3 seconden invultijd
const REVIEW_LS_KEY = "review_last_sent";

async function verwerkReviewFormulier(client) {
  const reviewForm = document.getElementById("reviewForm");
  if (!reviewForm) return;

  const laadtijd = Date.now();

  reviewForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(reviewForm);

    // 1. Honeypot-controle: bots vullen het verborgen veld in
    const honeypot = String(formData.get("website") || "").trim();
    if (honeypot) return; // stil afwijzen, geen foutmelding geven aan bots

    // 2. Minimale invultijd: te snel = bot
    if (Date.now() - laadtijd < REVIEW_MIN_FILL_MS) {
      toonReviewStatus("Vul het formulier in voordat je verzendt.", "error");
      return;
    }

    // 3. Cooldown: maximaal 1 recensie per uur per browser
    const laatsteVerzending = Number(localStorage.getItem(REVIEW_LS_KEY) || 0);
    if (Date.now() - laatsteVerzending < REVIEW_COOLDOWN_MS) {
      const minuten = Math.ceil((REVIEW_COOLDOWN_MS - (Date.now() - laatsteVerzending)) / 60000);
      toonReviewStatus(`Je kunt over ${minuten} minuten opnieuw een recensie sturen.`, "error");
      return;
    }

    const naam = String(formData.get("name") || "").trim();
    const bericht = String(formData.get("message") || "").trim();
    const rating = Number(formData.get("rating"));

    if (!naam || !bericht || !rating) {
      toonReviewStatus("Vul alle velden in voordat je verzendt.", "error");
      return;
    }

    // 4. Turnstile-controle
    const turnstileToken = window.turnstile?.getResponse();
    if (!turnstileToken) {
      toonReviewStatus("Bevestig eerst dat je geen robot bent.", "error");
      return;
    }

    toonReviewStatus("Recensie wordt verzonden...", "info");

    let res;
    try {
      res = await fetch(EDGE_FUNCTION_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ name: naam, message: bericht, rating, token: turnstileToken }),
      });
    } catch {
      toonReviewStatus("Verbindingsfout. Controleer je internetverbinding.", "error");
      window.turnstile?.reset();
      return;
    }

    const resultaat = await res.json().catch(() => ({}));

    if (!res.ok) {
      toonReviewStatus(resultaat.error || "Verzenden mislukt. Probeer later opnieuw.", "error");
      window.turnstile?.reset();
      return;
    }

    localStorage.setItem(REVIEW_LS_KEY, String(Date.now()));
    reviewForm.reset();
    window.turnstile?.reset();
    toonReviewStatus("Bedankt. Je recensie is ontvangen en wacht op goedkeuring.", "success");
  });
}

function initialiseerRecensies() {
  if (!heeftReviewElementen()) return;

  if (!window.supabase || typeof window.supabase.createClient !== "function") {
    renderReviews([], "Supabase-bibliotheek kon niet worden geladen.");
    toonReviewStatus("Supabase is nog niet beschikbaar op deze pagina.", "error");
    return;
  }

  if (!heeftSupabaseConfig()) {
    renderReviews([], "Vul eerst je Supabase-config in om recensies te tonen.");
    toonReviewStatus("Voeg eerst je Supabase URL en anon key toe in script.js.", "info");
    return;
  }

  reviewClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  koppelReviewPaginering();
  laadRecensies(reviewClient, 1);
  verwerkReviewFormulier(reviewClient);
}

// ── Variabelen spel ─────────────────────────────────────────
let scoreSpeler = 0;
let scoreComputer = 0;
let bezig = false;

const emoji = {
  steen: "✊",
  papier: "✋",
  frans: '<img src="hoofd.png" alt="Frans" class="keuze-icon" />'
};

const keuzes = ["steen", "papier", "frans"];

const keuzeNamen = {
  steen: "Steen",
  papier: "Papier",
  frans: "Frans"
};

function keuzeWeergave(keuze) {
  return emoji[keuze] || "";
}

function toonResultaatPulse(uitslag) {
  if (!document.body.classList.contains("game")) return;

  document.body.classList.remove("game-win", "game-lose", "game-draw");

  if (uitslag === "gewonnen") {
    document.body.classList.add("game-win");
  } else if (uitslag === "verloren") {
    document.body.classList.add("game-lose");
  } else {
    document.body.classList.add("game-draw");
  }

  setTimeout(() => {
    document.body.classList.remove("game-win", "game-lose", "game-draw");
  }, 780);
}

// ── Helpers ─────────────────────────────────────────────────
function spelElementenBestaan() {
  return (
    document.getElementById("handSpeler") &&
    document.getElementById("handComputer") &&
    document.getElementById("scoreSpeler") &&
    document.getElementById("scoreComputer") &&
    document.getElementById("jouwKeuze") &&
    document.getElementById("computerKeuze") &&
    document.getElementById("resultaat")
  );
}

// ── Hoofdfunctie ────────────────────────────────────────────
function speel(spelerKeuze) {
  if (!spelElementenBestaan()) return;
  if (bezig) return;
  bezig = true;

  const computerKeuze = keuzes[Math.floor(Math.random() * 3)];

  const handSpeler = document.getElementById("handSpeler");
  const handComputer = document.getElementById("handComputer");

  handSpeler.textContent = "✊";
  handComputer.textContent = "✊";

  handSpeler.classList.remove("schudden");
  handComputer.classList.remove("schudden");

  void handSpeler.offsetWidth;
  void handComputer.offsetWidth;

  handSpeler.classList.add("schudden");
  handComputer.classList.add("schudden");

  setTimeout(() => {
    handSpeler.classList.remove("schudden");
    handComputer.classList.remove("schudden");

    handSpeler.innerHTML = keuzeWeergave(spelerKeuze);
    handComputer.innerHTML = keuzeWeergave(computerKeuze);

    const uitslag = bepaalUitslag(spelerKeuze, computerKeuze);
    werkScoreBij(uitslag);
    toonResultaat(spelerKeuze, computerKeuze, uitslag);
    toonResultaatPulse(uitslag);

    bezig = false;
  }, 1200);
}

// ── Uitslag bepalen ─────────────────────────────────────────
function bepaalUitslag(speler, computer) {
  if (speler === computer) return "gelijk";

  if (
    (speler === "steen" && computer === "frans") ||
    (speler === "papier" && computer === "steen") ||
    (speler === "frans" && computer === "papier")
  ) {
    return "gewonnen";
  }

  return "verloren";
}

// ── Score bijwerken ─────────────────────────────────────────
function werkScoreBij(uitslag) {
  if (uitslag === "gewonnen") scoreSpeler++;
  if (uitslag === "verloren") scoreComputer++;

  document.getElementById("scoreSpeler").textContent = scoreSpeler;
  document.getElementById("scoreComputer").textContent = scoreComputer;
}

// ── Resultaat tonen ─────────────────────────────────────────
function toonResultaat(speler, computer, uitslag) {
  document.getElementById("jouwKeuze").innerHTML =
    "Jouw keuze: " + keuzeWeergave(speler) + " " + keuzeNamen[speler];

  document.getElementById("computerKeuze").innerHTML =
    "Computer keuze: " + keuzeWeergave(computer) + " " + keuzeNamen[computer];

  const resultaatEl = document.getElementById("resultaat");
  resultaatEl.className = "resultaat";

  if (uitslag === "gewonnen") {
    resultaatEl.textContent = "🎉 Je hebt gewonnen!";
    resultaatEl.classList.add("gewonnen");
  } else if (uitslag === "verloren") {
    resultaatEl.textContent = "😢 Je hebt verloren!";
    resultaatEl.classList.add("verloren");
  } else {
    resultaatEl.textContent = "🤝 Gelijkspel!";
    resultaatEl.classList.add("gelijk");
  }
}

// ── Reset ───────────────────────────────────────────────────
function reset() {
  if (!spelElementenBestaan()) return;

  scoreSpeler = 0;
  scoreComputer = 0;
  bezig = false;

  document.getElementById("scoreSpeler").textContent = 0;
  document.getElementById("scoreComputer").textContent = 0;

  document.getElementById("jouwKeuze").textContent = "Jouw keuze: —";
  document.getElementById("computerKeuze").textContent = "Computer keuze: —";

  const resultaatEl = document.getElementById("resultaat");
  resultaatEl.textContent = "Maak een keuze om te beginnen!";
  resultaatEl.className = "resultaat";

  document.getElementById("handSpeler").textContent = "✊";
  document.getElementById("handComputer").textContent = "✊";
}
