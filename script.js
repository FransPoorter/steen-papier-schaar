document.addEventListener("DOMContentLoaded", () => {
  // Fade-in voor alle pagina's
  document.body.classList.add("loaded");
});

// ── Variabelen spel ─────────────────────────────────────────
let scoreSpeler = 0;
let scoreComputer = 0;
let bezig = false;

const emoji = {
  steen: "✊",
  papier: "✋",
  schaar: "✌️"
};

const keuzes = ["steen", "papier", "schaar"];

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

    handSpeler.textContent = emoji[spelerKeuze];
    handComputer.textContent = emoji[computerKeuze];

    const uitslag = bepaalUitslag(spelerKeuze, computerKeuze);
    werkScoreBij(uitslag);
    toonResultaat(spelerKeuze, computerKeuze, uitslag);

    bezig = false;
  }, 1200);
}

// ── Uitslag bepalen ─────────────────────────────────────────
function bepaalUitslag(speler, computer) {
  if (speler === computer) return "gelijk";

  if (
    (speler === "steen" && computer === "schaar") ||
    (speler === "papier" && computer === "steen") ||
    (speler === "schaar" && computer === "papier")
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
  document.getElementById("jouwKeuze").textContent =
    "Jouw keuze: " + emoji[speler] + " " + speler;

  document.getElementById("computerKeuze").textContent =
    "Computer keuze: " + emoji[computer] + " " + computer;

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
