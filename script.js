// ── Variabelen ──────────────────────────────────────────────
let scoreSpeler   = 0;
let scoreComputer = 0;
let bezig         = false; // blokkeert klikken tijdens animatie

// Emoji per keuze
const emoji = {
  steen:  '✊',
  papier: '✋',
  schaar: '✌️'
};

// Mogelijke keuzes voor de computer
const keuzes = ['steen', 'papier', 'schaar'];

// ── Hoofdfunctie ─────────────────────────────────────────────
function speel(spelerKeuze) {
  if (bezig) return;
  bezig = true;

  const computerKeuze = keuzes[Math.floor(Math.random() * 3)];

  const handSpeler   = document.getElementById('handSpeler');
  const handComputer = document.getElementById('handComputer');

  handSpeler.textContent   = '✊';
  handComputer.textContent = '✊';

  // Verwijder de klasse eerst (voor het geval die er nog op zit)
  handSpeler.classList.remove('schudden');
  handComputer.classList.remove('schudden');

  // Forceer een reflow zodat de browser de klasse echt opnieuw toevoegt
  void handSpeler.offsetWidth;
  void handComputer.offsetWidth;

  // Start de schud-animatie
  handSpeler.classList.add('schudden');
  handComputer.classList.add('schudden');

  setTimeout(function () {
    handSpeler.classList.remove('schudden');
    handComputer.classList.remove('schudden');

    handSpeler.textContent   = emoji[spelerKeuze];
    handComputer.textContent = emoji[computerKeuze];

    const uitslag = bepaalUitslag(spelerKeuze, computerKeuze);
    werkScoreBij(uitslag);
    toonResultaat(spelerKeuze, computerKeuze, uitslag);

    bezig = false;
  }, 1200);
}

// ── Uitslag bepalen ──────────────────────────────────────────
function bepaalUitslag(speler, computer) {
  if (speler === computer) return 'gelijk';

  if (
    (speler === 'steen'  && computer === 'schaar') ||
    (speler === 'papier' && computer === 'steen')  ||
    (speler === 'schaar' && computer === 'papier')
  ) {
    return 'gewonnen';
  }

  return 'verloren';
}

// ── Score bijwerken ──────────────────────────────────────────
function werkScoreBij(uitslag) {
  if (uitslag === 'gewonnen') scoreSpeler++;
  if (uitslag === 'verloren') scoreComputer++;

  document.getElementById('scoreSpeler').textContent   = scoreSpeler;
  document.getElementById('scoreComputer').textContent = scoreComputer;
}

// ── Resultaat tonen ──────────────────────────────────────────
function toonResultaat(speler, computer, uitslag) {
  document.getElementById('jouwKeuze').textContent =
    'Jouw keuze: ' + emoji[speler] + ' ' + speler;

  document.getElementById('computerKeuze').textContent =
    'Computer keuze: ' + emoji[computer] + ' ' + computer;

  const resultaatEl = document.getElementById('resultaat');
  resultaatEl.className = 'resultaat'; // reset kleuren

  if (uitslag === 'gewonnen') {
    resultaatEl.textContent = '🎉 Je hebt gewonnen!';
    resultaatEl.classList.add('gewonnen');
  } else if (uitslag === 'verloren') {
    resultaatEl.textContent = '😢 Je hebt verloren!';
    resultaatEl.classList.add('verloren');
  } else {
    resultaatEl.textContent = '🤝 Gelijkspel!';
    resultaatEl.classList.add('gelijk');
  }
}

// ── Reset ────────────────────────────────────────────────────
function reset() {
  scoreSpeler   = 0;
  scoreComputer = 0;

  document.getElementById('scoreSpeler').textContent   = 0;
  document.getElementById('scoreComputer').textContent = 0;

  document.getElementById('jouwKeuze').textContent     = 'Jouw keuze: —';
  document.getElementById('computerKeuze').textContent = 'Computer keuze: —';

  const resultaatEl = document.getElementById('resultaat');
  resultaatEl.textContent = 'Maak een keuze om te beginnen!';
  resultaatEl.className   = 'resultaat';

  // Handen terug naar standaard
  document.getElementById('handSpeler').textContent   = '✊';
  document.getElementById('handComputer').textContent = '✊';
}
