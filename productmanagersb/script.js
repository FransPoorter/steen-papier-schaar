/**
 * Productmanager SB – Tab navigation and routing
 */
(function () {
  'use strict';

  /* ====== Auth Gate ====== */
  const AUTH_HASH = '491f32cf93f069ef5872636fcc931bfbfd3ce68f764cc2db25352f4acebcca62';
  const AUTH_KEY = 'pmsb_auth';

  async function sha256(text) {
    const data = new TextEncoder().encode(text);
    const buf = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  function initAuthGate() {
    const gate = document.getElementById('authGate');
    if (!gate) return;

    if (sessionStorage.getItem(AUTH_KEY) === '1') {
      gate.hidden = true;
      return;
    }

    const form = document.getElementById('authForm');
    const input = document.getElementById('authInput');
    const error = document.getElementById('authError');

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      const hash = await sha256(input.value);
      if (hash === AUTH_HASH) {
        sessionStorage.setItem(AUTH_KEY, '1');
        gate.hidden = true;
      } else {
        error.hidden = false;
        input.value = '';
        input.focus();
      }
    });
  }

  initAuthGate();

  const TABS = [
    { id: 'introductie', title: 'Introductie', subtitle: 'Welkom', badge: null, check: true, keywords: ['welkom', 'begin', 'introductie', 'frans'] },
    { id: 'motivatie', title: 'Mijn motivatie', subtitle: 'Waarom Productmanagement SB', badge: null, check: false, keywords: ['motivatie', 'waarom', 'productmanagement', 'solliciteren'] },
    { id: 'ervaring', title: 'Ervaring met SB', subtitle: 'Praktijk en klantprocessen', badge: null, check: false, keywords: ['ervaring', 'sb', 'klanten', 'praktijk', 'processen'] },
    { id: 'productvisie', title: 'Productvisie', subtitle: 'Richting, keuzes en kansen', badge: null, check: false, keywords: ['visie', 'roadmap', 'product', 'toekomst', 'richting', 'keuzes', 'kansen', 'innovatie', 'ai', 'prioriteiten'] },
    { id: 'ontwikkeling', title: 'Mijn ontwikkeling', subtitle: 'Bewust groeien in de rol', badge: null, check: false, keywords: ['ontwikkeling', 'groeien', 'leren', 'rol', '100 dagen', 'plan'] },
    { id: 'afsluiting', title: 'Afsluiting', subtitle: 'Waarom deze sollicitatie', badge: null, check: false, keywords: ['afsluiting', 'slot', 'ai', 'kameleon', 'contact', 'sollicitatie', 'productmanager'] }
  ];

  const DEFAULT_TAB = 'introductie';

  function getActiveTabFromURL() {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    const valid = TABS.find(t => t.id === tab);
    return valid ? tab : DEFAULT_TAB;
  }

  function activateTab(tabId, pushState) {
    // Update tabs
    const tabButtons = document.querySelectorAll('.afas-tab');
    const panels = document.querySelectorAll('.afas-tab-panel');

    tabButtons.forEach(btn => {
      const isActive = btn.dataset.tab === tabId;
      btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
      btn.setAttribute('tabindex', isActive ? '0' : '-1');
    });

    panels.forEach(panel => {
      const isActive = panel.id === 'panel-' + tabId;
      panel.setAttribute('aria-hidden', isActive ? 'false' : 'true');
    });

    // Scroll active tab into view
    const activeBtn = document.querySelector(`.afas-tab[data-tab="${tabId}"]`);
    if (activeBtn) {
      activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }

    // Update URL
    if (pushState) {
      const url = new URL(window.location);
      url.searchParams.set('tab', tabId);
      window.history.pushState({ tab: tabId }, '', url);
    }
  }

  function handleTabClick(e) {
    const btn = e.currentTarget;
    const tabId = btn.dataset.tab;
    activateTab(tabId, true);
  }

  function handleTabKeydown(e) {
    const tabButtons = Array.from(document.querySelectorAll('.afas-tab'));
    const currentIndex = tabButtons.indexOf(e.currentTarget);
    let newIndex = currentIndex;

    switch (e.key) {
      case 'ArrowRight':
        newIndex = (currentIndex + 1) % tabButtons.length;
        e.preventDefault();
        break;
      case 'ArrowLeft':
        newIndex = (currentIndex - 1 + tabButtons.length) % tabButtons.length;
        e.preventDefault();
        break;
      case 'Home':
        newIndex = 0;
        e.preventDefault();
        break;
      case 'End':
        newIndex = tabButtons.length - 1;
        e.preventDefault();
        break;
      case 'Enter':
      case ' ':
        activateTab(e.currentTarget.dataset.tab, true);
        e.preventDefault();
        return;
      default:
        return;
    }

    tabButtons[newIndex].focus();
    activateTab(tabButtons[newIndex].dataset.tab, true);
  }

  function init() {
    const tabButtons = document.querySelectorAll('.afas-tab');

    tabButtons.forEach(btn => {
      btn.addEventListener('click', handleTabClick);
      btn.addEventListener('keydown', handleTabKeydown);
    });

    // Handle popstate (browser back/forward)
    window.addEventListener('popstate', function () {
      activateTab(getActiveTabFromURL(), false);
    });

    // Activate initial tab
    activateTab(getActiveTabFromURL(), false);
  }

  // Notification panel toggle
  function initNotifications() {
    var btn = document.getElementById('notificationBtn');
    var panel = document.getElementById('notificationPanel');
    if (!btn || !panel) return;

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var isOpen = !panel.hidden;
      panel.hidden = isOpen;
      btn.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
    });

    document.addEventListener('click', function (e) {
      if (!panel.hidden && !panel.contains(e.target) && e.target !== btn) {
        panel.hidden = true;
        btn.setAttribute('aria-expanded', 'false');
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !panel.hidden) {
        panel.hidden = true;
        btn.setAttribute('aria-expanded', 'false');
        btn.focus();
      }
    });

    // Tab switching within notification panel
    var tabs = panel.querySelectorAll('.afas-notification-panel__tab');
    var contents = panel.querySelectorAll('.afas-notification-panel__content');
    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () {
        tabs.forEach(function (t) { t.classList.remove('is-active'); });
        tab.classList.add('is-active');
        contents.forEach(function (c) { c.hidden = true; });
        if (contents[i]) contents[i].hidden = false;
      });
    });
  }

  // ==================== JONAS CHAT ====================
  const JONAS_RESPONSE = 'Hoe leuk zou het zijn als je Jonas alles over Frans kon vragen? Vanwege privacy en veiligheid houden we dat toch liever persoonlijk. Nieuwsgierig geworden? Stel je vraag dan vooral aan Frans zelf! Dat levert waarschijnlijk ook een veel leuker gesprek op.';
  let jonasOpen = false;

  function openJonas() {
    const panel = document.getElementById('jonasChatPanel');
    const btn = document.getElementById('jonasBtn');
    if (!panel) return;
    panel.hidden = false;
    panel.offsetHeight; // force reflow
    panel.classList.add('is-open');
    btn.setAttribute('aria-expanded', 'true');
    jonasOpen = true;
    const input = document.getElementById('jonasChatInput');
    if (input) input.focus();
  }

  function closeJonas() {
    const panel = document.getElementById('jonasChatPanel');
    const btn = document.getElementById('jonasBtn');
    if (!panel) return;
    panel.classList.remove('is-open');
    btn.setAttribute('aria-expanded', 'false');
    jonasOpen = false;
    btn.focus();
    setTimeout(function () {
      if (!jonasOpen) panel.hidden = true;
    }, 260);
  }

  function scrollChatToBottom() {
    const messages = document.getElementById('jonasChatMessages');
    if (messages) messages.scrollTop = messages.scrollHeight;
  }

  function createMessageEl(role, text) {
    const wrapper = document.createElement('div');
    wrapper.className = 'jonas-chat__message jonas-chat__message--' + role;

    const avatar = document.createElement('div');
    avatar.className = 'jonas-chat__message-avatar';
    avatar.innerHTML = role === 'jonas'
      ? '<img src="/Jonas.png" alt="Jonas" class="jonas-chat__avatar-img">'
      : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>';

    const content = document.createElement('div');
    content.className = 'jonas-chat__message-content';

    const meta = document.createElement('div');
    meta.className = 'jonas-chat__message-meta';
    const name = document.createElement('span');
    name.className = 'jonas-chat__message-name';
    name.textContent = role === 'jonas' ? 'Jonas' : 'Jij';
    const time = document.createElement('span');
    time.className = 'jonas-chat__message-time';
    const now = new Date();
    time.textContent = now.getHours() + ':' + String(now.getMinutes()).padStart(2, '0');
    meta.appendChild(name);
    meta.appendChild(time);

    const bubble = document.createElement('div');
    bubble.className = 'jonas-chat__message-bubble';
    const p = document.createElement('p');
    p.textContent = text;
    bubble.appendChild(p);

    content.appendChild(meta);
    content.appendChild(bubble);
    wrapper.appendChild(avatar);
    wrapper.appendChild(content);
    return wrapper;
  }

  function createTypingEl() {
    const wrapper = document.createElement('div');
    wrapper.className = 'jonas-chat__typing';
    wrapper.setAttribute('aria-label', 'Jonas is aan het typen');
    const avatar = document.createElement('div');
    avatar.className = 'jonas-chat__message-avatar';
    avatar.innerHTML = '<img src="/Jonas.png" alt="Jonas" class="jonas-chat__avatar-img">';
    const dots = document.createElement('div');
    dots.className = 'jonas-chat__typing-dots';
    dots.innerHTML = '<span class="jonas-chat__typing-dot"></span><span class="jonas-chat__typing-dot"></span><span class="jonas-chat__typing-dot"></span>';
    wrapper.appendChild(avatar);
    wrapper.appendChild(dots);
    return wrapper;
  }

  function sendJonasMessage() {
    const input = document.getElementById('jonasChatInput');
    const messages = document.getElementById('jonasChatMessages');
    const sendBtn = document.getElementById('jonasSendBtn');
    if (!input || !messages) return;

    const text = input.value.trim();
    if (!text) return;

    messages.appendChild(createMessageEl('user', text));
    input.value = '';
    sendBtn.disabled = true;
    input.style.height = 'auto';
    scrollChatToBottom();

    const typing = createTypingEl();
    messages.appendChild(typing);
    scrollChatToBottom();

    const delay = 500 + Math.random() * 400;
    setTimeout(function () {
      messages.removeChild(typing);
      messages.appendChild(createMessageEl('jonas', JONAS_RESPONSE));
      scrollChatToBottom();
    }, delay);
  }

  function initJonas() {
    const btn = document.getElementById('jonasBtn');
    const closeBtn = document.getElementById('jonasCloseBtn');
    const input = document.getElementById('jonasChatInput');
    const sendBtn = document.getElementById('jonasSendBtn');
    if (!btn) return;

    btn.addEventListener('click', function () {
      jonasOpen ? closeJonas() : openJonas();
    });

    if (closeBtn) closeBtn.addEventListener('click', closeJonas);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && jonasOpen) closeJonas();
    });

    if (input && sendBtn) {
      input.addEventListener('input', function () {
        sendBtn.disabled = !input.value.trim();
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 120) + 'px';
      });

      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          if (input.value.trim()) sendJonasMessage();
        }
      });

      sendBtn.addEventListener('click', sendJonasMessage);
    }
  }

  // ==================== INTRO DASHBOARD ====================
  function initIntroDashboard() {
    var visitedKey = 'introVisitedTabs';
    var visited = [];
    try {
      visited = JSON.parse(sessionStorage.getItem(visitedKey)) || [];
    } catch (e) { visited = []; }

    // Always mark introductie as visited
    if (visited.indexOf('introductie') === -1) visited.push('introductie');
    sessionStorage.setItem(visitedKey, JSON.stringify(visited));

    function markVisited(tabId) {
      if (visited.indexOf(tabId) === -1) {
        visited.push(tabId);
        sessionStorage.setItem(visitedKey, JSON.stringify(visited));
      }
      updateNavBadges();
    }

    function updateNavBadges() {
      var rows = document.querySelectorAll('.intro-nav-row');
      rows.forEach(function (row) {
        var tabId = row.getAttribute('data-target-tab');
        var badge = row.querySelector('.intro-nav-row__badge');
        if (!badge) return;
        if (visited.indexOf(tabId) !== -1) {
          badge.className = 'intro-nav-row__badge intro-nav-row__badge--check';
          badge.setAttribute('aria-label', 'Bekeken');
          badge.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="#15803d" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>';
        }
      });
    }

    function navigateToTab(tabId) {
      markVisited(tabId);
      activateTab(tabId, true);
      var panel = document.getElementById('panel-' + tabId);
      if (panel) panel.focus();
    }

    // Navigation rows
    var navRows = document.querySelectorAll('.intro-nav-row[data-target-tab]');
    navRows.forEach(function (row) {
      row.addEventListener('click', function () {
        var tabId = row.getAttribute('data-target-tab');
        navigateToTab(tabId);
      });
    });

    // Clickable KPI card
    var kpiClickables = document.querySelectorAll('.intro-dashboard__card--clickable[data-target-tab]');
    kpiClickables.forEach(function (card) {
      card.addEventListener('click', function () {
        var tabId = card.getAttribute('data-target-tab');
        navigateToTab(tabId);
      });
    });

    // Dashboard header nav
    var headerNavItems = document.querySelectorAll('.intro-dashboard__nav-item[data-nav-tab]');
    headerNavItems.forEach(function (item) {
      item.addEventListener('click', function () {
        var tabId = item.getAttribute('data-nav-tab');
        navigateToTab(tabId);
      });
    });

    // Track tab visits from main tab bar
    var tabButtons = document.querySelectorAll('.afas-tab[data-tab]');
    tabButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var tabId = btn.getAttribute('data-tab') || btn.dataset.tab;
        markVisited(tabId);
      });
    });

    // Initial badge update
    updateNavBadges();

    // Energie KPI count-up animation (0% → 100%, once)
    var energieEl = document.getElementById('energieKpiValue');
    if (energieEl) {
      var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReduced) {
        energieEl.textContent = '100%';
      } else {
        energieEl.textContent = '0%';
        var animated = false;
        var observer = new IntersectionObserver(function (entries) {
          if (entries[0].isIntersecting && !animated) {
            animated = true;
            observer.disconnect();
            var start = null;
            var duration = 700;
            function step(ts) {
              if (!start) start = ts;
              var progress = Math.min((ts - start) / duration, 1);
              var eased = 1 - Math.pow(1 - progress, 3);
              energieEl.textContent = Math.round(eased * 100) + '%';
              if (progress < 1) requestAnimationFrame(step);
            }
            requestAnimationFrame(step);
          }
        }, { threshold: 0.3 });
        observer.observe(energieEl);
      }
    }

    // Twijfel KPI count-down animation (100% → 0%, once)
    var twijfelEl = document.getElementById('twijfelKpiValue');
    if (twijfelEl) {
      var prefersReducedT = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReducedT) {
        twijfelEl.textContent = '0%';
      } else {
        twijfelEl.textContent = '100%';
        var animatedT = false;
        var observerT = new IntersectionObserver(function (entries) {
          if (entries[0].isIntersecting && !animatedT) {
            animatedT = true;
            observerT.disconnect();
            var startT = null;
            var durationT = 700;
            function stepT(ts) {
              if (!startT) startT = ts;
              var progress = Math.min((ts - startT) / durationT, 1);
              var eased = 1 - Math.pow(1 - progress, 3);
              twijfelEl.textContent = Math.round(100 - eased * 100) + '%';
              if (progress < 1) requestAnimationFrame(stepT);
            }
            requestAnimationFrame(stepT);
          }
        }, { threshold: 0.3 });
        observerT.observe(twijfelEl);
      }
    }

  }

  // ==================== ERVARING MET SB ====================
  function initExperience() {
    // KPI Configuration
    var experienceKpis = [
      { id: 'implementations', title: 'SB-implementaties', value: '100+', subtitle: 'Klanten begeleid bij een goede start met SB.' },
      { id: 'migrations', title: 'Migraties uitgevoerd', value: '3000+', subtitle: 'Administraties succesvol naar SB gebracht.' },
      { id: 'own-administrations', title: 'Eigen administraties', value: 4, subtitle: 'SB ook ervaren als dagelijkse gebruiker.', tone: 'primary', tooltip: 'Naast mijn werkervaring gebruik ik SB ook voor vier eigen administraties.' },
      { id: 'incidents', title: 'Incidenten opgelost', value: '1770+', subtitle: 'Van analyse tot een werkende oplossing.' },
      { id: 'practice-hours', title: 'Praktijkuren in SB', value: '≈ 5000', subtitle: 'Gewerkt in AFAS SB.' },
      { id: 'client-hours', title: 'Uren met klanten', value: '≈ 2000', subtitle: 'Klanten helpen met het werken met SB.' }
    ];

    // Practice stories configuration
    var practiceStories = [
      {
        category: 'Klant en adoptie',
        title: 'WEA Deltaland van Profit naar SB',
        summary: 'WEA Deltaland begeleid bij de volledige overstap naar SB, inclusief migratie, ingebruikname en de nieuwe Agro-functionaliteit.',
        tags: ['Klantbegeleiding', 'Migratie', 'Adoptie', 'Agro'],
        detail: {
          heading: 'WEA Deltaland van Profit naar SB',
          sections: [
            { title: 'Situatie', text: 'WEA Deltaland stapte met haar administraties over van Profit naar AFAS SB. Daarbij ging het niet alleen om het migreren van gegevens. Ook de medewerkers moesten leren werken met SB en tegelijkertijd werd de nieuwe Agro-functionaliteit in gebruik genomen.' },
            { title: 'Mijn rol', text: 'Ik had tijdens dit traject een centrale rol. Voor inhoudelijke vragen over SB was ik het eerste aanspreekpunt en ik begeleidde WEA bij de volledige overstap: van de migratie tot het daadwerkelijk werken met SB.' },
            { title: 'Mijn aanpak', text: 'Om samen tempo te maken, organiseerden we migratiedagen op het AFAS-kantoor. Medewerkers van WEA kwamen naar Leusden en we probeerden op zo\u2019n dag zoveel mogelijk administraties over te zetten.\n\nDie dagen vroegen veel tijd en inzet van WEA en waren niet altijd eenvoudig. Ik vond het daarom belangrijk om de energie erin te houden, mensen te motiveren en er samen iets positiefs van te maken. Met enthousiasme, persoonlijke begeleiding en soms een creatieve aanpak zorgden we ervoor dat iedereen bleef aanhaken.' },
            { title: 'Resultaat', text: 'Uiteindelijk zijn alle geplande administraties succesvol naar SB gemigreerd. WEA kon met SB \u00e9n de Agro-functionaliteit aan de slag.\n\nDe ervaringen uit dit traject hebben daarnaast waardevolle inzichten opgeleverd waarmee ook het migratieproces voor andere SB-klanten verder kon worden verbeterd.' }
          ],
          insight: 'Een migratie naar SB is pas echt geslaagd als niet alleen de administratie is overgezet, maar de klant ook begrijpt hoe SB werkt en er met vertrouwen mee verder kan.'
        }
      },
      {
        category: 'Productverbetering',
        title: 'Migratie verbeteren vanuit de praktijk',
        summary: 'Knelpunten uit eerdere migraties verzameld en samen met collega\u2019s vertaald naar concrete verbeteringen in het product.',
        tags: ['Productverbetering', 'Migratie', 'Samenwerking', 'Klantinzicht'],
        detail: {
          heading: 'Migratie verbeteren vanuit de praktijk',
          sections: [
            { title: 'Situatie', text: 'Tijdens eerdere migraties hield ik voor mezelf een lijst bij van zaken die volgens mij slimmer, duidelijker of eenvoudiger konden. Toen ook de Boekhoudfabriek naar SB zou worden overgezet, was dat een goed moment om deze inzichten breder te bespreken.' },
            { title: 'Mijn rol', text: 'Ik bracht de signalen uit de praktijk bij elkaar en nam het initiatief om ze samen met collega\u2019s inhoudelijk uit te werken.' },
            { title: 'Mijn aanpak', text: 'Samen met Michiel, Brand-Jan en Arnoud heb ik de punten doorgenomen en verder uitgewerkt. Daarmee brachten we concrete praktijkervaring naar het product en konden verschillende onderdelen van het migratieproces worden verbeterd.' },
            { title: 'Resultaat', text: 'Bij een latere presentatie aan VvAA konden we daardoor een veel sterkere migratiedemo geven. Het verschil met eerdere migraties was duidelijk zichtbaar.' }
          ],
          insight: 'Productverbetering begint vaak bij kleine signalen die je consequent vastlegt en op het juiste moment bij elkaar brengt.'
        }
      },
      {
        category: 'Implementatie en adoptie',
        title: 'Van nul naar een vaste SB-implementatie',
        summary: 'Een volledige implementatieaanpak opgezet waarmee administratie- en accountantskantoren sneller en consistenter met SB aan de slag kunnen.',
        tags: ['Implementatie', 'Kennisoverdracht', 'Procesverbetering', 'Servicemanagement'],
        detail: {
          heading: 'Van nul naar een vaste SB-implementatie',
          sections: [
            { title: 'Situatie', text: 'Toen ik bij Team SB kwam, bestond er nog geen vaste aanpak voor de implementatie van administratie- en accountantskantoren. Kantoren moesten SB leren kennen, inrichten en in gebruik nemen, maar een duidelijk proces om hen daarbij te begeleiden ontbrak nog.' },
            { title: 'Mijn rol', text: 'Samen met het team heb ik het implementatieproces van begin tot eind opgebouwd. Daarbij keken we niet alleen naar de inrichting van SB, maar ook naar de manier waarop we kennis het beste konden overdragen en klanten stap voor stap konden meenemen.' },
            { title: 'Mijn aanpak', text: 'We hebben een vaste implementatieroute ingericht waarmee kantoren zelfstandig en in een logische volgorde aan de slag kunnen. Via het leerportaal deelden we de benodigde kennis, namen we instructievideo\u2019s op en legden we duidelijk vast welke stappen een kantoor moest doorlopen om SB goed in te richten.\n\nOok het proces daaromheen hebben we uitgewerkt. Daardoor weten klanten wat er van hen wordt verwacht en kunnen collega\u2019s vanuit Servicemanagement sneller ondersteunen wanneer dat nodig is. De kennis zit daarmee niet alleen bij een paar mensen, maar is op een vaste en herhaalbare manier beschikbaar.' },
            { title: 'Resultaat', text: 'Door de vaste aanpak kost een implementatie merkbaar minder tijd en kunnen we klanten sneller en consistenter begeleiden. Ook collega\u2019s van Servicemanagement kunnen klanten hierdoor eenvoudiger meenemen in SB en de kennis op een vaste manier overdragen. Van kantoren hebben we veel positieve reacties gekregen over de duidelijkheid van het proces en de manier waarop de kennis wordt aangeboden.' }
          ],
          insight: 'Een goede implementatie draait niet alleen om uitleg geven. Door het proces, de kennis en de verantwoordelijkheden vooraf goed in te richten, kunnen klanten sneller zelfstandig met SB werken en kunnen we meer kantoren op dezelfde goede manier begeleiden.'
        }
      },
      {
        category: 'Praktisch productidee',
        title: 'Van handmatig mappen naar een Slimme SB Auditfile mapper',
        summary: 'Een Mapping Manager gebouwd die mappingbestanden samenvoegt, automatisch koppelingen voorstelt en waarschuwt voor conflicten en ontbrekende instellingen.',
        tags: ['Migratie', 'Automatisering', 'Productverbetering', 'Kwaliteitscontrole'],
        detail: {
          heading: 'Van handmatig mappen naar een Slimme SB Auditfile mapper',
          image: {
            src: 'afassbmappingmanager.png',
            alt: 'AFAS SB Mapping Manager voor het importeren, controleren en exporteren van mappingbestanden',
            caption: 'Prototype van de AFAS SB Mapping Manager.'
          },
          sections: [
            { title: 'Situatie', text: 'Bij een migratie van een ander boekhoudpakket naar AFAS SB moeten de oude grootboekrekeningen worden gekoppeld aan de juiste grootboekrekeningen in SB. Wanneer meerdere administraties hetzelfde rekeningschema gebruiken, kun je daarvoor een bestaand mappingbestand hergebruiken.\n\nWat nog ontbrak, was een eenvoudige manier om mappings van verschillende administraties samen te voegen. Daardoor moest er nog veel handmatig worden uitgezocht en was het bij grotere migraties lastig om het overzicht te bewaren.' },
            { title: 'Mijn rol', text: 'Omdat ik dit tijdens migraties regelmatig tegenkwam, ben ik gaan kijken hoe het slimmer kon. Zo ontstond de AFAS SB Mapping Manager: een werkend prototype waarmee mappingbestanden kunnen worden ingelezen, samengevoegd, gecontroleerd en weer ge\u00ebxporteerd.' },
            { title: 'Mijn aanpak', text: 'In de Mapping Manager kun je meerdere bestaande mappingbestanden inlezen en samenvoegen tot \u00e9\u00e9n centrale mapping. Daarbij houdt de tool rekening met verschillende rechtsvormen en functionaliteiten zoals Agro.\n\nDaarnaast heb ik een automatische mapper gemaakt. Je importeert een AFAS-auditfile en de tool doet vervolgens een voorstel voor de koppeling tussen de oude grootboekrekeningen en de rekeningen in SB. Daarna kun je de uitkomst filteren, controleren en waar nodig aanpassen.\n\nDe tool waarschuwt ook wanneer er iets niet klopt. Bijvoorbeeld als een rekening dubbel is gemapt, mappings met elkaar conflicteren, een koppeling ontbreekt of een bepaalde functionaliteit nog moet worden geactiveerd.' },
            { title: 'Resultaat', text: 'Het prototype laat zien dat een tijdrovend onderdeel van een migratie een stuk overzichtelijker kan. Bestaande mappings kunnen opnieuw worden gebruikt, terwijl de controles helpen om fouten eerder te vinden.\n\nDaardoor hoeft niet iedere administratie volledig met de hand te worden gemapt en ontstaat er meer grip op de kwaliteit van de uiteindelijke mapping naar SB.' }
          ],
          insight: 'Bij migraties zit veel waarde in werk dat al eerder is gedaan. Door bestaande mappings te hergebruiken en automatisch te controleren, kunnen we het werk voor de gebruiker verminderen en migraties naar SB sneller en betrouwbaarder maken.'
        }
      }
    ];

    // Calculate AFAS experience duration
    function calcDuration() {
      var start = new Date(2022, 10, 1); // 1 november 2022
      var now = new Date();
      var years = now.getFullYear() - start.getFullYear();
      var months = now.getMonth() - start.getMonth();
      if (now.getDate() < start.getDate()) months--;
      if (months < 0) { years--; months += 12; }
      var parts = [];
      if (years > 0) parts.push(years + (years === 1 ? ' jaar' : ' jaar'));
      if (months > 0) parts.push(months + (months === 1 ? ' maand' : ' maanden'));
      return parts.join(' en ') || '0 maanden';
    }

    var durationEl = document.getElementById('afasExperienceDuration');
    if (durationEl) durationEl.textContent = calcDuration();

    // Render KPIs
    var kpiGrid = document.getElementById('expKpiGrid');
    if (kpiGrid) {
      kpiGrid.innerHTML = experienceKpis.map(function(kpi) {
        var isEmpty = kpi.value === null || kpi.value === undefined;
        var displayValue = isEmpty ? '\u2014' : kpi.value;
        var valueClass = 'exp-dashboard__kpi-value' + (isEmpty ? ' exp-dashboard__kpi-value--empty' : '');
        var cardClass = 'exp-dashboard__kpi-card' + (isEmpty ? ' exp-dashboard__kpi-card--empty' : '');
        var tooltipAttr = kpi.tooltip ? ' title="' + kpi.tooltip.replace(/"/g, '&quot;') + '"' : '';
        var emptyLabel = isEmpty && kpi.emptyLabel ? '<span class="exp-dashboard__kpi-empty">' + kpi.emptyLabel + '</span>' : '';
        return '<div class="' + cardClass + '"' + tooltipAttr + '>' +
          '<span class="exp-dashboard__kpi-title">' + kpi.title + '</span>' +
          '<span class="' + valueClass + '">' + displayValue + '</span>' +
          '<span class="exp-dashboard__kpi-subtitle">' + kpi.subtitle + '</span>' +
          emptyLabel +
          '</div>';
      }).join('');
    }

    // Render story cards
    var storiesGrid = document.getElementById('expStoriesGrid');
    if (storiesGrid) {
      storiesGrid.innerHTML = practiceStories.map(function(story, i) {
        return '<button class="exp-story-card" type="button" data-story-index="' + i + '" aria-label="Bekijk praktijkverhaal: ' + story.title + '">' +
          '<span class="exp-story-card__category">' + story.category + '</span>' +
          '<h4 class="exp-story-card__title">' + story.title + '</h4>' +
          '<p class="exp-story-card__summary">' + story.summary + '</p>' +
          '<span class="exp-story-card__action">Bekijk praktijkverhaal \u2192</span>' +
          '</button>';
      }).join('');
    }

    // Story panel interaction
    var panel = document.getElementById('expStoryPanel');
    var panelTitle = document.getElementById('expStoryPanelTitle');
    var panelBody = document.getElementById('expStoryPanelBody');
    var panelClose = document.getElementById('expStoryCloseBtn');
    var panelBackdrop = document.getElementById('expStoryBackdrop');
    var lastFocusedEl = null;

    function openStory(index) {
      var story = practiceStories[index];
      if (!story || !panel) return;
      lastFocusedEl = document.activeElement;
      panelTitle.textContent = story.detail.heading;
      var html = '';
      story.detail.sections.forEach(function(s, i) {
        html += '<div class="exp-story-panel__section"><h4>' + s.title + '</h4><p>' + s.text + '</p></div>';
        if (i === 1 && story.detail.image) {
          html += '<figure class="exp-story-panel__figure">' +
            '<img class="exp-story-panel__image" src="' + story.detail.image.src + '" alt="' + story.detail.image.alt + '">' +
            '<figcaption class="exp-story-panel__caption">' + story.detail.image.caption + '</figcaption>' +
            '</figure>';
        }
      });
      html += '<div class="exp-story-panel__insight"><h4>Productinzicht</h4><p>' + story.detail.insight + '</p></div>';
      panelBody.innerHTML = html;
      panel.hidden = false;
      panel.style.display = 'flex';
      document.body.style.overflow = 'hidden';
      panelClose.focus();
    }

    function closeStory() {
      if (!panel) return;
      panel.hidden = true;
      panel.style.display = 'none';
      document.body.style.overflow = '';
      if (lastFocusedEl) lastFocusedEl.focus();
    }

    if (storiesGrid) {
      storiesGrid.addEventListener('click', function(e) {
        var btn = e.target.closest('[data-story-index]');
        if (btn) openStory(parseInt(btn.getAttribute('data-story-index'), 10));
      });
    }

    if (panelClose) panelClose.addEventListener('click', closeStory);
    if (panelBackdrop) panelBackdrop.addEventListener('click', closeStory);
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && panel && !panel.hidden) closeStory();
    });
  }

  function initAll() {
    init();
    initNotifications();
    initJonas();
    initUserSettings();
    initMenuWarning();
    initHelpWarning();
    initSpotlight();
    initIntroDashboard();
    initExperience();
  }

  // ==================== USER SETTINGS MODAL ====================
  function initUserSettings() {
    var btn = document.getElementById('userBtn');
    var modal = document.getElementById('userSettingsModal');
    var backdrop = document.getElementById('userSettingsBackdrop');
    var closeBtn = document.getElementById('userSettingsCloseBtn');
    if (!btn || !modal || !backdrop) return;

    function openModal() {
      backdrop.hidden = false;
      modal.hidden = false;
      backdrop.offsetHeight;
      backdrop.classList.add('is-visible');
      modal.classList.add('is-visible');
      btn.setAttribute('aria-expanded', 'true');
    }

    function closeModal() {
      backdrop.classList.remove('is-visible');
      modal.classList.remove('is-visible');
      btn.setAttribute('aria-expanded', 'false');
      setTimeout(function () {
        backdrop.hidden = true;
        modal.hidden = true;
      }, 200);
    }

    btn.addEventListener('click', openModal);
    if (closeBtn) closeBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      closeModal();
    });
    backdrop.addEventListener('click', closeModal);
    modal.addEventListener('click', function (e) {
      e.stopPropagation();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !modal.hidden) closeModal();
    });
  }

  // ==================== MENU WARNING DIALOG ====================
  function initMenuWarning() {
    var menuBtn = document.getElementById('menuBtn');
    var menuDialog = document.getElementById('menuWarningDialog');
    var menuBackdrop = document.getElementById('menuWarningBackdrop');
    var menuCloseBtn = document.getElementById('menuWarningCloseBtn');
    var menuActionBtn = document.getElementById('menuWarningActionBtn');
    if (!menuBtn || !menuDialog || !menuBackdrop) return;

    function showMenu() {
      menuBackdrop.hidden = false;
      menuDialog.hidden = false;
      menuBackdrop.offsetHeight;
      menuBackdrop.classList.add('is-visible');
      menuDialog.classList.add('is-visible');
    }

    function hideMenu() {
      menuBackdrop.classList.remove('is-visible');
      menuDialog.classList.remove('is-visible');
      menuBackdrop.hidden = true;
      menuDialog.hidden = true;
    }

    menuBtn.onclick = function () { showMenu(); };
    menuCloseBtn.onclick = function () { hideMenu(); menuBtn.focus(); };
    menuBackdrop.onclick = function () { hideMenu(); menuBtn.focus(); };
    menuActionBtn.onclick = function () { hideMenu(); setTimeout(openSpotlight, 0); };
  }

  // ==================== HELP WARNING DIALOG ====================
  function initHelpWarning() {
    var helpBtn = document.getElementById('helpBtn');
    var helpDialog = document.getElementById('helpWarningDialog');
    var helpBackdrop = document.getElementById('helpWarningBackdrop');
    var helpCloseBtn = document.getElementById('helpWarningCloseBtn');
    if (!helpBtn || !helpDialog || !helpBackdrop) return;

    function showHelp() {
      helpBackdrop.hidden = false;
      helpDialog.hidden = false;
      helpBackdrop.offsetHeight;
      helpBackdrop.classList.add('is-visible');
      helpDialog.classList.add('is-visible');
    }

    function hideHelp() {
      helpBackdrop.classList.remove('is-visible');
      helpDialog.classList.remove('is-visible');
      helpBackdrop.hidden = true;
      helpDialog.hidden = true;
    }

    helpBtn.onclick = function () { showHelp(); };
    if (helpCloseBtn) helpCloseBtn.onclick = function () { hideHelp(); helpBtn.focus(); };
    helpBackdrop.onclick = function () { hideHelp(); helpBtn.focus(); };
  }

  // ==================== SPOTLIGHT SEARCH ====================
  var spotlightOpen = false;
  var spotlightSelectedIndex = 0;
  var spotlightFiltered = [];
  var spotlightOpener = null;
  var spotlightHideTimeout = null;
  var spotlightOpenTime = 0;

  function openSpotlight(openerEl) {
    var backdrop = document.getElementById('spotlightBackdrop');
    var dialog = document.getElementById('spotlightDialog');
    var input = document.getElementById('spotlightInput');
    if (!backdrop || !dialog) return;

    if (spotlightHideTimeout) {
      clearTimeout(spotlightHideTimeout);
      spotlightHideTimeout = null;
    }

    spotlightOpener = openerEl || document.activeElement;
    backdrop.hidden = false;
    dialog.hidden = false;
    backdrop.offsetHeight;
    backdrop.classList.add('is-visible');
    dialog.classList.add('is-visible');
    spotlightOpen = true;
    spotlightOpenTime = Date.now();

    input.value = '';
    renderSpotlightResults('');
    if (input) input.focus();
  }

  function closeSpotlight() {
    var backdrop = document.getElementById('spotlightBackdrop');
    var dialog = document.getElementById('spotlightDialog');
    if (!backdrop || !dialog) return;
    if (!spotlightOpen) return;

    backdrop.classList.remove('is-visible');
    dialog.classList.remove('is-visible');
    spotlightOpen = false;

    spotlightHideTimeout = setTimeout(function () {
      backdrop.hidden = true;
      dialog.hidden = true;
      spotlightHideTimeout = null;
    }, 150);

    if (spotlightOpener && spotlightOpener.focus) {
      spotlightOpener.focus();
    }
  }

  function filterTabs(query) {
    var q = query.toLowerCase().trim();
    if (!q) return TABS.slice();
    return TABS.filter(function (tab) {
      var haystack = (tab.title + ' ' + tab.subtitle + ' ' + tab.keywords.join(' ')).toLowerCase();
      return haystack.indexOf(q) !== -1;
    });
  }

  function renderSpotlightResults(query) {
    var list = document.getElementById('spotlightResults');
    var empty = document.getElementById('spotlightEmpty');
    var input = document.getElementById('spotlightInput');
    if (!list) return;

    spotlightFiltered = filterTabs(query);
    spotlightSelectedIndex = 0;
    list.innerHTML = '';

    if (spotlightFiltered.length === 0) {
      if (empty) empty.hidden = false;
      input.setAttribute('aria-activedescendant', '');
      return;
    }

    if (empty) empty.hidden = true;

    spotlightFiltered.forEach(function (tab, i) {
      var li = document.createElement('li');
      li.className = 'spotlight__result' + (i === 0 ? ' is-selected' : '');
      li.setAttribute('role', 'option');
      li.setAttribute('id', 'spotlight-opt-' + i);
      li.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
      li.dataset.tabId = tab.id;

      var title = document.createElement('span');
      title.className = 'spotlight__result-title';
      title.textContent = tab.title;

      var subtitle = document.createElement('span');
      subtitle.className = 'spotlight__result-subtitle';
      subtitle.textContent = tab.subtitle;

      li.appendChild(title);
      li.appendChild(subtitle);
      list.appendChild(li);
    });

    input.setAttribute('aria-activedescendant', 'spotlight-opt-0');
  }

  function updateSpotlightSelection(newIndex) {
    var list = document.getElementById('spotlightResults');
    var input = document.getElementById('spotlightInput');
    if (!list) return;

    var items = list.querySelectorAll('.spotlight__result');
    if (items.length === 0) return;

    if (newIndex < 0) newIndex = items.length - 1;
    if (newIndex >= items.length) newIndex = 0;

    items[spotlightSelectedIndex].classList.remove('is-selected');
    items[spotlightSelectedIndex].setAttribute('aria-selected', 'false');

    spotlightSelectedIndex = newIndex;
    items[spotlightSelectedIndex].classList.add('is-selected');
    items[spotlightSelectedIndex].setAttribute('aria-selected', 'true');
    items[spotlightSelectedIndex].scrollIntoView({ block: 'nearest' });
    input.setAttribute('aria-activedescendant', 'spotlight-opt-' + spotlightSelectedIndex);
  }

  function selectSpotlightResult() {
    if (spotlightFiltered.length === 0) return;
    var tab = spotlightFiltered[spotlightSelectedIndex];
    closeSpotlight();
    activateTab(tab.id, true);
  }

  function initSpotlight() {
    var backdrop = document.getElementById('spotlightBackdrop');
    var input = document.getElementById('spotlightInput');
    var list = document.getElementById('spotlightResults');
    if (!backdrop || !input) return;

    backdrop.addEventListener('click', function () {
      if (Date.now() - spotlightOpenTime < 100) return;
      closeSpotlight();
    });

    input.addEventListener('input', function () {
      renderSpotlightResults(input.value);
    });

    input.addEventListener('keydown', function (e) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          updateSpotlightSelection(spotlightSelectedIndex + 1);
          break;
        case 'ArrowUp':
          e.preventDefault();
          updateSpotlightSelection(spotlightSelectedIndex - 1);
          break;
        case 'Enter':
          e.preventDefault();
          selectSpotlightResult();
          break;
        case 'Escape':
          e.preventDefault();
          closeSpotlight();
          break;
      }
    });

    if (list) {
      list.addEventListener('click', function (e) {
        var li = e.target.closest('.spotlight__result');
        if (!li) return;
        var idx = Array.from(list.children).indexOf(li);
        spotlightSelectedIndex = idx;
        selectSpotlightResult();
      });
    }

    // Ctrl+K / Cmd+K / Ctrl+Space shortcut
    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === ' ')) {
        var active = document.activeElement;
        var isInput = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable);
        if (isInput && active.id !== 'spotlightInput') return;
        e.preventDefault();
        if (spotlightOpen) {
          closeSpotlight();
        } else {
          openSpotlight();
        }
      }
      if (e.key === 'Escape' && spotlightOpen) {
        closeSpotlight();
      }
    });
  }

  // ==================== AUTO VERSION ====================
  function fetchVersion() {
    var el = document.getElementById('appVersion');
    if (!el) return;
    fetch('https://api.github.com/repos/FransPoorter/steen-papier-schaar/commits/main', {
      headers: { Accept: 'application/vnd.github.v3+json' }
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data && data.commit && data.commit.message) {
          var version = data.commit.message.trim().split('\n')[0];
          el.textContent = 'v' + version;
        }
      })
      .catch(function () { /* keep fallback */ });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { initAll(); fetchVersion(); });
  } else {
    initAll();
    fetchVersion();
  }
})();
