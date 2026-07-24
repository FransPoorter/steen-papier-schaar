/**
 * Productmanager SB – Tab navigation and routing
 */
(function () {
  'use strict';

  const TABS = [
    { id: 'introductie', title: 'Introductie', subtitle: 'Welkom', badge: null, check: true },
    { id: 'motivatie', title: 'Mijn motivatie', subtitle: 'Waarom Productmanagement SB', badge: null, check: false },
    { id: 'ervaring', title: 'Ervaring met SB', subtitle: 'Praktijk en klantprocessen', badge: '3', check: false },
    { id: 'productvisie', title: 'Productvisie', subtitle: 'Richting en roadmap', badge: null, check: false },
    { id: 'klantwaarde', title: 'Klantwaarde', subtitle: 'Behoeften en eenvoud', badge: '5', check: false },
    { id: 'prioriteiten', title: 'Prioriteiten', subtitle: 'Kiezen en resultaat', badge: null, check: true },
    { id: 'innovatie', title: 'Innovatie & AI', subtitle: 'Kansen voor SB', badge: '2', check: false },
    { id: 'eerste100dagen', title: 'Eerste 100 dagen', subtitle: 'Van visie naar actie', badge: null, check: false },
    { id: 'afsluiting', title: 'Afsluiting', subtitle: 'Kennismaken', badge: null, check: true }
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
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }
})();
