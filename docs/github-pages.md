# Publish the course website with GitHub Pages

The public source repository is [Harvard-IACS/AC215-new-site](https://github.com/Harvard-IACS/AC215-new-site). The preview website is [harvard-iacs.github.io/AC215-new-site/](https://harvard-iacs.github.io/AC215-new-site/).

GitHub Actions builds and publishes the website after each push to `main`. The workflow is [pages.yml](../.github/workflows/pages.yml). In the repository's **Settings → Pages**, the publishing source must be **GitHub Actions**. A failed build leaves the previously published website in place. You can rerun publication from **Actions → Publish course website → Run workflow**.

Only `frontend/dist/` is published as the website. The complete frontend, FastAPI backend, public course notes, tests and optional Google Cloud deployment materials stay in the source repository. The Pages build sets `VITE_ENABLE_CHAT=false`; it has no chatbot controls or backend requests. GitHub Pages does not run the Python backend.

## Edit or preview locally

From the repository folder:

```bash
npm ci --prefix frontend
npm run dev --prefix frontend
```

Open the local address printed in the terminal. Most course wording is in `frontend/src/data/course-pages/` and `frontend/src/data/milestones/`. Source records are in `docs/design-reference/course-showcase/`. Preserve published course rules when editing.

To test the GitHub Pages address locally:

```bash
VITE_BASE_PATH=/AC215-new-site/ npm run build --prefix frontend
npm run check:static --prefix frontend
VITE_BASE_PATH=/AC215-new-site/ npm run preview --prefix frontend
```

Open `http://127.0.0.1:4173/AC215-new-site/`. The build creates complete HTML for direct visits to every course page. Static checks verify local page links, images, styles, scripts and legacy aliases. Do not commit generated output, dependencies, private environment files, credentials or local backups.

## Keep existing course addresses

The build preserves the old page paths, including `/schedule/`, `/tutorials_demo/`, `/faq/`, `/ProjectShowcase/`, `/readings/` and `/milestone1/` through `/milestone5/`. `/staff/` opens the teaching team on Home, `/projects/` opens the milestones, and `/calendar/` opens Schedule. Explicit `.html` page links also work.

The new repository's preview prefix is `/AC215-new-site/`. The current live course prefix is `/2026-AC215/`. To keep full existing addresses at replacement time, publish the new build through the existing `2026-AC215` Pages repository with that prefix. The workflow reads its prefix from Pages settings, so the same source can build for either repository. Setting up this preview does not replace or redirect the old website. Do that cutover only after the preview is accepted.

Publishing follows the [GitHub Pages custom-workflow guide](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages) and [Vite's GitHub Pages guide](https://vite.dev/guide/static-deploy.html#github-pages).
