/**
 * Productmanager SB – Tab navigation and routing
 */
(function () {
  'use strict';

  const TABS = [
    { id: 'introductie', title: 'Introductie', subtitle: 'Welkom', badge: null, check: true, keywords: ['welkom', 'begin', 'introductie', 'frans'] },
    { id: 'motivatie', title: 'Mijn motivatie', subtitle: 'Waarom Productmanagement SB', badge: null, check: false, keywords: ['motivatie', 'waarom', 'productmanagement', 'solliciteren'] },
    { id: 'ervaring', title: 'Ervaring met SB', subtitle: 'Praktijk en klantprocessen', badge: '3', check: false, keywords: ['ervaring', 'sb', 'klanten', 'praktijk', 'processen'] },
    { id: 'productvisie', title: 'Productvisie', subtitle: 'Richting en roadmap', badge: null, check: false, keywords: ['visie', 'roadmap', 'product', 'toekomst', 'richting'] },
    { id: 'klantwaarde', title: 'Klantwaarde', subtitle: 'Behoeften en eenvoud', badge: '5', check: false, keywords: ['klant', 'waarde', 'eenvoud', 'behoefte', 'focussessie'] },
    { id: 'prioriteiten', title: 'Prioriteiten', subtitle: 'Kiezen en resultaat', badge: null, check: true, keywords: ['keuzes', 'prioriteiten', 'resultaat', 'nee zeggen'] },
    { id: 'innovatie', title: 'Innovatie & AI', subtitle: 'Kansen voor SB', badge: '2', check: false, keywords: ['innovatie', 'automatisering', 'ai', 'jonas', 'kansen'] },
    { id: 'eerste100dagen', title: 'Eerste 100 dagen', subtitle: 'Van visie naar actie', badge: null, check: false, keywords: ['100 dagen', 'plan', 'aanpak', 'eerste periode'] },
    { id: 'afsluiting', title: 'Afsluiting', subtitle: 'Kennismaken', badge: null, check: true, keywords: ['afsluiting', 'contact', 'kennismaken', 'gesprek'] }
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

  function initAll() {
    init();
    initNotifications();
    initJonas();
    initUserSettings();
    initMenuWarning();
    initHelpWarning();
    initSpotlight();
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

  // ==================== WARNING DIALOG FACTORY ====================
  function createWarningDialog(config) {
    var triggerBtn = document.getElementById(config.triggerBtnId);
    var dialog = document.getElementById(config.dialogId);
    var backdrop = document.getElementById(config.backdropId);
    var closeBtn = document.getElementById(config.closeBtnId);
    var actionBtn = document.getElementById(config.actionBtnId);
    if (!triggerBtn || !dialog || !backdrop) return;

    function open() {
      backdrop.hidden = false;
      dialog.hidden = false;
      backdrop.offsetHeight;
      backdrop.classList.add('is-visible');
      dialog.classList.add('is-visible');
      if (actionBtn) actionBtn.focus();
    }

    function close() {
      backdrop.classList.remove('is-visible');
      dialog.classList.remove('is-visible');
      setTimeout(function () {
        backdrop.hidden = true;
        dialog.hidden = true;
      }, 150);
      triggerBtn.focus();
    }

    triggerBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      open();
    });

    if (closeBtn) {
      closeBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        close();
      });
    }

    backdrop.addEventListener('click', function (e) {
      e.stopPropagation();
      close();
    });

    if (actionBtn) {
      actionBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        backdrop.classList.remove('is-visible');
        dialog.classList.remove('is-visible');
        setTimeout(function () {
          backdrop.hidden = true;
          dialog.hidden = true;
          if (config.onAction) config.onAction();
        }, 160);
      });
    }

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !dialog.hidden) {
        e.preventDefault();
        e.stopImmediatePropagation();
        close();
      }
    });

    // Focus trap
    dialog.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return;
      var focusable = dialog.querySelectorAll('button:not([hidden])');
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });
  }

  // ==================== MENU WARNING DIALOG ====================
  function initMenuWarning() {
    createWarningDialog({
      triggerBtnId: 'menuBtn',
      dialogId: 'menuWarningDialog',
      backdropId: 'menuWarningBackdrop',
      closeBtnId: 'menuWarningCloseBtn',
      actionBtnId: 'menuWarningActionBtn',
      onAction: function () { openSpotlight(); }
    });
  }

  // ==================== HELP WARNING DIALOG ====================
  function initHelpWarning() {
    createWarningDialog({
      triggerBtnId: 'helpBtn',
      dialogId: 'helpWarningDialog',
      backdropId: 'helpWarningBackdrop',
      closeBtnId: 'helpWarningCloseBtn',
      actionBtnId: 'helpWarningActionBtn',
      onAction: function () { openJonas(); }
    });
  }

  // ==================== SPOTLIGHT SEARCH ====================
  var spotlightOpen = false;
  var spotlightSelectedIndex = 0;
  var spotlightFiltered = [];
  var spotlightOpener = null;

  function openSpotlight(openerEl) {
    var backdrop = document.getElementById('spotlightBackdrop');
    var dialog = document.getElementById('spotlightDialog');
    var input = document.getElementById('spotlightInput');
    if (!backdrop || !dialog) return;

    spotlightOpener = openerEl || document.activeElement;
    backdrop.hidden = false;
    dialog.hidden = false;
    backdrop.offsetHeight;
    backdrop.classList.add('is-visible');
    dialog.classList.add('is-visible');
    spotlightOpen = true;

    input.value = '';
    renderSpotlightResults('');
    if (input) input.focus();
  }

  function closeSpotlight() {
    var backdrop = document.getElementById('spotlightBackdrop');
    var dialog = document.getElementById('spotlightDialog');
    if (!backdrop || !dialog) return;

    backdrop.classList.remove('is-visible');
    dialog.classList.remove('is-visible');
    spotlightOpen = false;

    setTimeout(function () {
      backdrop.hidden = true;
      dialog.hidden = true;
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

    backdrop.addEventListener('click', closeSpotlight);

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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }
})();
