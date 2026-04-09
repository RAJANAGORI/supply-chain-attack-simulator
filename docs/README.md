# GitHub Pages (`docs/`)

This directory is the **publish root** for GitHub Pages (`_config.yml`).

## Same folders as `documentation/`?

You will see **`learning-path/`**, **`modules/`**, **`scenario-guides/`**, and top-level `*.md` files here. In this repository they are **symbolic links** to the matching paths under **`documentation/`**—not separate copies. Editing a file under `documentation/learning-path/…` is the same as editing it through `docs/learning-path/…`.

| In `docs/` | Points to |
|------------|-----------|
| `learning-path/` | `../documentation/learning-path/` |
| `modules/` | `../documentation/modules/` |
| `scenario-guides/` | `../documentation/scenario-guides/` |
| `QUICK_START.md`, `SETUP.md`, `SCENARIOS.md`, … | `../documentation/<same name>` |

**Only in `docs/`** (not symlinked): site assets such as **`index.html`**, **`styles.css`**, **`404.html`**, **`sitemap.xml`**, **`og-image.png`**, **`robots.txt`**, **`_config.yml`**.

**Canonical doc index:** [`documentation/README.md`](../documentation/README.md) (docs map).

On **Windows**, if symlinks do not resolve, enable git symlink support or Developer Mode, or work only under **`documentation/`**.
