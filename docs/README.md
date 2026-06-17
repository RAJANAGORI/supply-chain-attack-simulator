# GitHub Pages (`docs/`)

This directory is the **publish root** for GitHub Pages (`_config.yml`).

## Directory layout

```text
docs/
├── index.html              Landing page
├── guide.html              Documentation hub (Markdown viewer)
├── docs-manifest.json      Navigation catalog for guide.html
├── index.md                → ../documentation/index.md (navigation hub)
├── DOCUMENTATION_INDEX.md  → ../documentation/index.md (alias for guide.html)
Governance Markdown (LEGAL.md, ATTRIBUTION.md, AUTHORS.md, DOCUMENTATION-CC-BY-NC-ND.md) is copied from repo root at Pages deploy — not symlinked under docs/ (avoids duplicate GitHub License tabs).
├── assets/
│   ├── css/                Landing + documentation hub styles
│   └── js/                 docs-app.js, theme.js
├── getting-started/        → ../documentation/getting-started/
├── platform/               → ../documentation/platform/
├── reference/              → ../documentation/reference/
├── learning-path/          → ../documentation/learning-path/
├── modules/                → ../documentation/modules/
├── scenario-guides/        → ../documentation/scenario-guides/
├── guides/                 → ../documentation/guides/
└── 404.html · sitemap.xml · robots.txt · og-image.png · _config.yml
```

## Same content as `documentation/`?

Markdown under **`getting-started/`**, **`platform/`**, **`reference/`**, **`learning-path/`**, **`modules/`**, **`scenario-guides/`**, and **`guides/`** are **symbolic links** to matching paths under **`documentation/`** — not separate copies. Edit under `documentation/` for content changes.

**Web docs:** Open [`guide.html`](./guide.html) for the full sequential documentation experience.

### Deploying to GitHub Pages

GitHub Pages does not publish symlinks that point outside `docs/`. Before deploy, run `./scripts/materialize-docs-for-pages.sh` (or use the GitHub Actions workflow) to replace symlinks with real copies.

Also present: **`docs/.nojekyll`** disables Jekyll so static HTML/JSON assets are served as-is.

On **Windows**, if symlinks do not resolve locally, enable git symlink support or Developer Mode, or work only under **`documentation/`**.
