(function () {
  'use strict';

  const REPO = 'https://github.com/rajanagori/supply-chain-attack-simulator';
  const REPO_BLOB = REPO + '/blob/main';
  const REPO_RAW = 'https://raw.githubusercontent.com/rajanagori/supply-chain-attack-simulator/main';

  /** @type {{ version: number, defaultDoc: string, repoUrl: string, sections: Array }} */
  let manifest = null;
  /** @type {Array<{ path: string, title: string, badge?: string, sectionId: string, sectionTitle: string }>} */
  let flatDocs = [];
  /** @type {Array<{ path: string, title: string, badge?: string }>} */
  let sequentialDocs = [];
  /** @type {Set<string>} */
  let allowedPaths = new Set();
  let currentPath = null;

  const els = {
    nav: document.getElementById('docs-nav'),
    content: document.getElementById('docs-content'),
    breadcrumb: document.getElementById('docs-breadcrumb'),
    progress: document.getElementById('docs-progress'),
    pager: document.getElementById('docs-pager'),
    search: document.getElementById('docs-search'),
    sidebar: document.getElementById('docs-sidebar'),
    backdrop: document.getElementById('docs-sidebar-backdrop'),
    toggle: document.getElementById('docs-sidebar-toggle'),
  };

  function basePath() {
    const meta = document.querySelector('meta[name="docs-base"]');
    if (meta && meta.content) {
      const content = meta.content.trim();
      if (content === './' || content === '.') return './';
      return content.replace(/\/?$/, '/');
    }
    if (window.location.pathname.indexOf('/supply-chain-attack-simulator') !== -1) {
      return '/supply-chain-attack-simulator/';
    }
    return './';
  }

  function guideUrl(path) {
    const base = basePath();
    if (base === './') {
      return 'guide.html?p=' + encodeURIComponent(path);
    }
    return base + 'guide.html?p=' + encodeURIComponent(path);
  }

  function normalizePath(p) {
    return p.replace(/^\.\//, '').replace(/\/+/g, '/');
  }

  function resolveRelative(fromPath, href) {
    if (/^https?:\/\//i.test(href) || href.startsWith('#') || href.startsWith('mailto:')) {
      return href;
    }
    if (href.startsWith('/')) return href;

    const fromDir = fromPath.includes('/') ? fromPath.replace(/\/[^/]+$/, '') + '/' : '';
    const combined = (fromDir + href).split('/');
    const stack = [];
    for (const part of combined) {
      if (part === '' || part === '.') continue;
      if (part === '..') stack.pop();
      else stack.push(part);
    }
    return stack.join('/');
  }

  function repoBlobUrl(relativePath) {
    const clean = normalizePath(String(relativePath).replace(/^(\.\.\/)+/, ''));
    return REPO_BLOB + '/' + clean;
  }

  const ROOT_REPO_DOCS = new Set([
    'COPYRIGHT.md',
    'ATTRIBUTION.md',
    'AUTHORS.md',
    'LICENSE-DOCUMENTATION.md',
    'LICENSE.md',
    'NOTICE.md',
    'CONTRIBUTING.md',
  ]);

  const DOC_PATH_ALIASES = {
    'DOCUMENTATION_INDEX.md': 'documentation/README.md',
  };

  /** Map resolved doc-relative paths to GitHub blob paths. */
  function repoPathForResolved(resolved) {
    if (DOC_PATH_ALIASES[resolved]) {
      return DOC_PATH_ALIASES[resolved];
    }
    if (ROOT_REPO_DOCS.has(resolved)) {
      return resolved;
    }
    if (resolved.startsWith('scenarios/') || resolved.includes('/scenarios/')) {
      return resolved;
    }
    if (resolved.startsWith('scripts/') || resolved.startsWith('observability/') ||
        resolved.startsWith('detection-tools/')) {
      return resolved;
    }
    if (resolved.startsWith('documentation/')) {
      return resolved;
    }
    return 'documentation/' + resolved;
  }

  function rawRepoUrl(path) {
    return REPO_RAW + '/' + repoPathForResolved(path);
  }

  async function fetchMarkdown(path) {
    const localUrl = basePath() + path;
    const urls = [localUrl, rawRepoUrl(path)];

    let lastError = null;
    for (let i = 0; i < urls.length; i++) {
      try {
        const res = await fetch(urls[i]);
        if (!res.ok) {
          lastError = new Error('HTTP ' + res.status);
          continue;
        }
        const text = await res.text();
        if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
          lastError = new Error('unexpected HTML response');
          continue;
        }
        return { text: text, source: i === 0 ? 'local' : 'github' };
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError || new Error('fetch failed');
  }

  function rewriteHref(fromPath, href) {
    if (/^https?:\/\//i.test(href) || href.startsWith('#') || href.startsWith('mailto:')) {
      return href;
    }

    const resolved = normalizePath(resolveRelative(fromPath, href));

    if (resolved.endsWith('.md') && allowedPaths.has(resolved)) {
      return guideUrl(resolved);
    }

    if (resolved.startsWith('scenarios/') || resolved.includes('/scenarios/')) {
      return repoBlobUrl(resolved);
    }

    if (resolved.startsWith('scripts/') || resolved.startsWith('observability/') ||
        resolved.startsWith('detection-tools/')) {
      return repoBlobUrl(resolved);
    }

    if (href.endsWith('.md')) {
      if (allowedPaths.has(resolved)) return guideUrl(resolved);
      return repoBlobUrl(repoPathForResolved(resolved));
    }

    return href;
  }

  function buildIndex(data) {
    flatDocs = [];
    sequentialDocs = [];
    allowedPaths = new Set();

    for (const section of data.sections) {
      for (const item of section.items) {
        allowedPaths.add(item.path);
        const entry = {
          path: item.path,
          title: item.title,
          badge: item.badge,
          sectionId: section.id,
          sectionTitle: section.title,
        };
        flatDocs.push(entry);
        if (section.sequential) {
          sequentialDocs.push({ path: item.path, title: item.title, badge: item.badge });
        }
      }
    }
  }

  const BADGE_CLASS = {
    Beginner: 'level-beginner',
    Intermediate: 'level-intermediate',
    Advanced: 'level-advanced',
    Expert: 'level-expert',
  };

  const BADGE_SHORT = {
    Beginner: 'Beg',
    Intermediate: 'Int',
    Advanced: 'Adv',
    Expert: 'Exp',
  };

  function renderSidebar(filter) {
    const q = (filter || '').trim().toLowerCase();
    els.nav.innerHTML = '';

    for (const section of manifest.sections) {
      const visibleItems = section.items.filter(function (item) {
        if (!q) return true;
        return item.title.toLowerCase().includes(q) || item.path.toLowerCase().includes(q);
      });
      if (q && visibleItems.length === 0) continue;

      const hasActive = visibleItems.some(function (item) {
        return item.path === currentPath;
      });

      const sectionEl = document.createElement('div');
      sectionEl.className = 'docs-nav-section';
      if (q || hasActive) {
        sectionEl.classList.remove('collapsed');
      } else {
        sectionEl.classList.add('collapsed');
      }

      const titleBtn = document.createElement('button');
      titleBtn.type = 'button';
      titleBtn.className = 'docs-nav-section-title';
      titleBtn.innerHTML =
        '<span class="section-label">' + escapeHtml(section.title) + '</span>' +
        (visibleItems.length > 4
          ? '<span class="section-count">' + visibleItems.length + '</span>'
          : '') +
        '<svg class="chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>';
      titleBtn.addEventListener('click', function () {
        sectionEl.classList.toggle('collapsed');
      });

      const list = document.createElement('ul');
      list.className = 'docs-nav-items';

      for (const item of visibleItems) {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = guideUrl(item.path);
        a.className = 'docs-nav-link' + (item.path === currentPath ? ' active' : '');
        a.dataset.path = item.path;
        a.title = item.title;

        let linkHtml = '<span class="docs-nav-link-text">' + escapeHtml(item.title) + '</span>';
        if (item.badge) {
          const short = BADGE_SHORT[item.badge] || item.badge;
          const cls = BADGE_CLASS[item.badge] || '';
          linkHtml += '<span class="docs-nav-badge ' + cls + '" title="' + escapeHtml(item.badge) + '">' + escapeHtml(short) + '</span>';
        }
        a.innerHTML = linkHtml;

        a.addEventListener('click', function (e) {
          e.preventDefault();
          navigate(item.path);
          closeSidebar();
        });
        li.appendChild(a);
        list.appendChild(li);
      }

      sectionEl.appendChild(titleBtn);
      sectionEl.appendChild(list);
      els.nav.appendChild(sectionEl);
    }
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function getDocMeta(path) {
    return flatDocs.find(function (d) { return d.path === path; });
  }

  function getSequentialIndex(path) {
    return sequentialDocs.findIndex(function (d) { return d.path === path; });
  }

  function renderPager(path) {
    const seqIdx = getSequentialIndex(path);
    els.pager.innerHTML = '';

    if (seqIdx === -1) {
      els.progress.textContent = '';
      return;
    }

    els.progress.textContent = 'Step ' + (seqIdx + 1) + ' of ' + sequentialDocs.length;

    const prev = seqIdx > 0 ? sequentialDocs[seqIdx - 1] : null;
    const next = seqIdx < sequentialDocs.length - 1 ? sequentialDocs[seqIdx + 1] : null;

    if (prev) {
      els.pager.appendChild(createPagerLink('prev', 'Previous', prev.title, prev.path));
    }
    if (next) {
      els.pager.appendChild(createPagerLink('next', 'Next', next.title, next.path));
    }
  }

  function createPagerLink(kind, label, title, path) {
    const a = document.createElement('a');
    a.href = guideUrl(path);
    a.className = 'docs-pager-link ' + kind;
    a.innerHTML =
      '<span class="docs-pager-label">' + escapeHtml(label) + '</span>' +
      '<span class="docs-pager-title">' + escapeHtml(title) + '</span>';
    a.addEventListener('click', function (e) {
      e.preventDefault();
      navigate(path);
    });
    return a;
  }

  function configureMarked() {
    const renderer = new marked.Renderer();

    renderer.code = function (code, infostring) {
      const lang = (infostring || '').trim().toLowerCase();
      if (lang === 'mermaid') {
        return '<div class="mermaid">' + code + '</div>';
      }
      const escaped = escapeHtml(code);
      return '<pre><code class="language-' + escapeHtml(lang) + '">' + escaped + '</code></pre>';
    };

    renderer.link = function (href, title, text) {
      const resolved = rewriteHref(currentPath, href);
      const external = /^https?:\/\//i.test(resolved) && !resolved.includes(window.location.host);
      const attrs = external ? ' target="_blank" rel="noopener noreferrer"' : '';
      const t = title ? ' title="' + escapeHtml(title) + '"' : '';
      return '<a href="' + escapeHtml(resolved) + '"' + t + attrs + '>' + text + '</a>';
    };

    marked.setOptions({
      renderer: renderer,
      gfm: true,
      breaks: false,
      headerIds: true,
      mangle: false,
    });
  }

  async function loadDoc(path) {
    if (!allowedPaths.has(path)) {
      showError('Document not found in catalog: ' + path);
      return;
    }

    currentPath = path;
    const meta = getDocMeta(path);

    els.content.innerHTML = '<div class="docs-loading">Loading…</div>';
    els.breadcrumb.innerHTML = meta
      ? '<span>' + escapeHtml(meta.sectionTitle) + '</span> / ' + escapeHtml(meta.title)
      : escapeHtml(path);

    document.title = (meta ? meta.title + ' · ' : '') + 'SCAS Documentation';

    let text;
    let loadedFromGithub = false;
    try {
      const result = await fetchMarkdown(path);
      text = result.text;
      loadedFromGithub = result.source === 'github';
    } catch (err) {
      showError('Could not load ' + path + '. ' + err.message + ' (static host may not publish symlinked docs — redeploy after running scripts/materialize-docs-for-pages.sh)');
      return;
    }

    configureMarked();
    els.content.innerHTML = marked.parse(text);

    els.content.insertAdjacentHTML('beforeend',
      '<div class="docs-source-note">Source: <a href="' + repoBlobUrl(repoPathForResolved(path)) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(repoPathForResolved(path)) + '</a> — © Raja Nagori. Documentation under CC BY-NC-ND 4.0 unless noted.' +
      (loadedFromGithub ? ' <em>(loaded from GitHub — run <code>scripts/materialize-docs-for-pages.sh</code> before deploy for offline hosting)</em>' : '') +
      '</div>'
    );

    bindInternalLinks();
    renderPager(path);
    renderSidebar(els.search.value);
    scrollActiveNavIntoView();

    if (window.mermaid) {
      try {
        await mermaid.run({ querySelector: '.docs-content .mermaid' });
      } catch (e) {
        console.warn('Mermaid render:', e);
      }
    }

    history.replaceState({ path: path }, '', guideUrl(path));
  }

  function bindInternalLinks() {
    els.content.querySelectorAll('a[href*="guide.html?p="]').forEach(function (a) {
      a.addEventListener('click', onGuideLinkClick);
    });
  }

  function onGuideLinkClick(e) {
    const href = e.currentTarget.getAttribute('href');
    const match = href.match(/[?&]p=([^&]+)/);
    if (!match) return;
    e.preventDefault();
    navigate(decodeURIComponent(match[1]));
  }

  function showError(msg) {
    els.content.innerHTML = '<div class="docs-error">' + escapeHtml(msg) + '</div>';
    els.pager.innerHTML = '';
    els.progress.textContent = '';
  }

  function navigate(path) {
    path = normalizePath(path);
    loadDoc(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function scrollActiveNavIntoView() {
    const active = els.nav.querySelector('.docs-nav-link.active');
    if (active) active.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  function closeSidebar() {
    els.sidebar.classList.remove('open');
    els.backdrop.classList.remove('open');
  }

  function openSidebar() {
    els.sidebar.classList.add('open');
    els.backdrop.classList.add('open');
  }

  function getInitialPath() {
    const params = new URLSearchParams(window.location.search);
    if (params.has('p')) return normalizePath(params.get('p'));
    const hash = window.location.hash.replace(/^#/, '');
    if (hash.startsWith('p=')) return normalizePath(decodeURIComponent(hash.slice(2)));
    return manifest.defaultDoc;
  }

  async function init() {
    if (els.toggle) {
      els.toggle.addEventListener('click', function () {
        if (els.sidebar.classList.contains('open')) closeSidebar();
        else openSidebar();
      });
    }
    if (els.backdrop) {
      els.backdrop.addEventListener('click', closeSidebar);
    }
    if (els.search) {
      els.search.addEventListener('input', function () {
        renderSidebar(els.search.value);
      });
    }

    window.addEventListener('popstate', function (e) {
      if (e.state && e.state.path) navigate(e.state.path);
    });

    window.addEventListener('scas-theme-change', function () {
      if (!currentPath || !allowedPaths.has(currentPath)) return;
      loadDoc(currentPath);
    });

    try {
      const res = await fetch(basePath() + 'docs-manifest.json');
      manifest = await res.json();
      buildIndex(manifest);
      renderSidebar('');
      navigate(getInitialPath());
    } catch (err) {
      showError('Failed to load documentation manifest: ' + err.message);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
