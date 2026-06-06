# GitHub Pages (`docs/`)

This directory is the **publish root** for GitHub Pages (`_config.yml`).

## Directory layout

```text
docs/
├── index.html              Landing page
├── guide.html              Documentation hub (Markdown viewer)
├── docs-manifest.json      Navigation catalog for guide.html
├── COPYRIGHT.md · ATTRIBUTION.md · AUTHORS.md · LICENSE-DOCUMENTATION.md  → repo root (symlinks)
├── assets/
│   ├── css/
│   │   ├── styles.css      Landing page styles
│   │   └── docs.css        Documentation hub styles
│   └── js/
│       ├── docs-app.js     Documentation hub app
│       └── theme.js        Dark / light theme toggle
├── 404.html · sitemap.xml · robots.txt · og-image.png · _config.yml
└── *.md + symlinks         → ../documentation/ (canonical content)
```

## Same folders as `documentation/`?

You will see **`learning-path/`**, **`modules/`**, **`scenario-guides/`**, and top-level `*.md` files here. In this repository they are **symbolic links** to the matching paths under **`documentation/`**—not separate copies. Editing a file under `documentation/learning-path/…` is the same as editing it through `docs/learning-path/…`.

| In `docs/` | Points to |
|------------|-----------|
| `learning-path/` | `../documentation/learning-path/` |
| `modules/` | `../documentation/modules/` |
| `scenario-guides/` | `../documentation/scenario-guides/` |
| `QUICK_START.md`, `SETUP.md`, `SCENARIOS.md`, … | `../documentation/<same name>` |

**Web docs:** Open [`guide.html`](./guide.html) for the full sequential documentation experience (Zero to Hero 01→22 and all platform guides), rendered from symlinked Markdown in `documentation/`.

### Deploying to GitHub Pages / custom domain

Markdown under `docs/` is mostly **symlinked** to `../documentation/` for a single source of truth in git. **GitHub Pages does not publish symlinks that point outside `docs/`**, so `guide.html` would 404 on `.md` files unless you:

1. **Recommended:** Enable GitHub Actions deploy (`.github/workflows/pages.yml`) — runs `scripts/materialize-docs-for-pages.sh` before upload, or  
2. **Manual:** Run `./scripts/materialize-docs-for-pages.sh` before pushing (replaces symlinks with real copies in `docs/`), or  
3. **Fallback:** `docs/assets/js/docs-app.js` loads from `raw.githubusercontent.com` when local `.md` returns 404 (works after JS deploy; requires network).

Also present: **`docs/.nojekyll`** disables Jekyll so static HTML/JSON assets are served as-is.

On **Windows**, if symlinks do not resolve locally, enable git symlink support or Developer Mode, or work only under **`documentation/`**.
