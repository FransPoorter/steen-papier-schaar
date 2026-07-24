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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
