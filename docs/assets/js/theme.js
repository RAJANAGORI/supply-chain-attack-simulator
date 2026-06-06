(function (global) {
  'use strict';

  var STORAGE_KEY = 'scas-theme';
  var META_COLORS = { dark: '#0a0a0f', light: '#f8f9fc' };

  function systemTheme() {
    if (global.matchMedia && global.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light';
    }
    return 'dark';
  }

  function getStoredTheme() {
    try {
      var stored = global.localStorage.getItem(STORAGE_KEY);
      if (stored === 'light' || stored === 'dark') return stored;
    } catch (e) { /* private mode */ }
    return systemTheme();
  }

  function applyTheme(theme) {
    var root = document.documentElement;
    root.setAttribute('data-theme', theme);
    root.style.colorScheme = theme;

    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', META_COLORS[theme] || META_COLORS.dark);

    document.querySelectorAll('[data-theme-toggle]').forEach(function (btn) {
      var next = theme === 'dark' ? 'light' : 'dark';
      btn.setAttribute('aria-label', 'Switch to ' + next + ' theme');
      btn.setAttribute('title', 'Switch to ' + next + ' theme');
    });
  }

  function setTheme(theme) {
    if (theme !== 'light' && theme !== 'dark') return;
    try {
      global.localStorage.setItem(STORAGE_KEY, theme);
    } catch (e) { /* ignore */ }
    applyTheme(theme);
    global.dispatchEvent(new CustomEvent('scas-theme-change', { detail: theme }));
  }

  function toggleTheme() {
    setTheme(getStoredTheme() === 'dark' ? 'light' : 'dark');
  }

  applyTheme(getStoredTheme());

  global.SCASTheme = {
    get: function () {
      return document.documentElement.getAttribute('data-theme') || 'dark';
    },
    set: setTheme,
    toggle: toggleTheme,
    mermaidTheme: function () {
      return global.SCASTheme.get() === 'light' ? 'default' : 'dark';
    },
  };

  function bindToggles() {
    document.querySelectorAll('[data-theme-toggle]').forEach(function (btn) {
      if (btn.dataset.themeBound) return;
      btn.dataset.themeBound = '1';
      btn.addEventListener('click', toggleTheme);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindToggles);
  } else {
    bindToggles();
  }

  if (global.matchMedia) {
    global.matchMedia('(prefers-color-scheme: light)').addEventListener('change', function (e) {
      try {
        if (global.localStorage.getItem(STORAGE_KEY)) return;
      } catch (err) { /* ignore */ }
      applyTheme(e.matches ? 'light' : 'dark');
    });
  }
})(window);
