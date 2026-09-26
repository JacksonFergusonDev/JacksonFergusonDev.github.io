# Jackson Ferguson Portfolio Agent Guidelines

Guidelines for AI agents working on this Astro portfolio, journal, and
photography archive.

## Project Purpose

- This is Jackson Ferguson's personal website for `jacksonferguson.me`.
- The site is a static Astro project deployed by GitHub Actions to GitHub Pages.
- Keep the site fast, quiet, technical, and personal. The visual style is dark,
  minimal, astronomy-adjacent, and cyan-accented.
- Protostar is the flagship project and should remain the most prominent and
  deeply explained project.

## Repository Layout

- `src/pages/index.astro`: landing page, project hierarchy, contact links, and
  homepage sections.
- `src/pages/trips/`: photo journal archive and gallery routes.
- `src/pages/creative/`: creative studio archive and routes for 3D scenes,
  generative Python, and live event sound.
- `src/content/trips/`: trip metadata and image lists.
- `src/content/creative/`: creative collections and Markdown write-ups.
- `src/content/config.ts`: Astro content collection schemas.
- `src/content.config.ts`: Astro content configuration re-export.
- `src/components/`: reusable Astro components, including the hero canvas,
  Asciinema demo, service icons, and gallery viewer.
- `src/layouts/`: base HTML document structure, shared header navigation,
  structured data, and footer.
- `src/scripts/data-field.ts`: homepage canvas interaction. It must respect
  reduced motion and pause work when offscreen.
- `src/styles/global.css`: global design system, responsive layout, and
  component styling.
- `src/lib/`: site metadata (`site.ts`), project catalog (`projects.ts`),
  and schema.org structured data (`structured-data.ts`).
- `public/`: static files copied through unchanged, including resumes, CNAME,
  fonts, and the site favicon. Some generated remote asset outputs are written
  here during development and build.
- `config/remote-assets.json`: central manifest for project assets fetched from
  upstream repositories at development and build time.
- `scripts/fetch-remote-assets.mjs`: validates the remote asset manifest,
  fetches the assets, and writes them into `public/`.
- `README.md`: repository overview, design decisions, and build-time project
  assets with source-repository rebuild triggers.

## Development Commands

Use npm and the local lockfile.

```sh
npm ci
npm run assets:fetch
npm run dev
npm run lint
npm run check
npm run build
npm test
npm run test:browser
npm run format:check
```

`npm run test:browser` expects a local preview or development server (`npx astro preview --host 127.0.0.1 --port 4322`). Install Chromium with `npx playwright install chromium`
if the browser binary is missing.

## Verification Expectations

- For content-only edits, run at least `npm run lint`, `npm run check`,
  `npm run build`, and `npm test`.
- For layout, navigation, gallery, animation, or interactive media changes, also
  run `npm run test:browser` and inspect the relevant page in a browser.
- For broad formatting or many Markdown/CSS/Astro edits, run
  `npm run format:check`; use `npm run format` only when formatting drift is
  intentional.

## Design and UX Rules

- Preserve the first viewport as a strong personal signal for Jackson Ferguson.
- Keep the hero immersive and full-bleed. Do not put the hero text in a card.
- Maintain responsive behavior across narrow mobile, portrait tablet, desktop,
  and short landscape viewports.
- Respect reduced-motion preferences for animation and media autoplay.
- Avoid decorative clutter. Prefer precise typography, thin rules, real project
  artifacts, and subdued motion over heavy illustration.
- Use the existing icon/component patterns before introducing a new dependency.
- Keep project cards and repeated items accessible by keyboard and meaningful
  without JavaScript.

## Content Rules

- Project importance follows the GitHub profile order and description depth:
  Protostar first, then Systems Audio Lab, Data Science Portfolio, CI/CD tooling,
  Star Ground, and the smaller/archive projects.
- Protostar links should emphasize its documentation and source. Its embedded
  Asciinema demo uses `public/protostar-demo.cast`.
- Most project headings and primary project actions should lead to their GitHub
  repositories unless the user requests a write-up-first flow.
- Technical articles are source-grounded summaries, not invented first-person
  postmortems.
- Keep resume PDFs in `public/resumes/` as downloadable static files.
- Do not change biography, education, measurements, dates, or project status
  unless you have a clear source or an explicit user correction.

## Remote Asset Rules

- `config/remote-assets.json` is the source list for build-time fetched upstream
  assets.
- Fetch remote project assets with `npm run assets:fetch`; normal development
  and production builds run this automatically.
- Reference the generated local `public/` paths from site pages and Markdown.
  Do not hot-link raw GitHub assets from visitor-facing markup unless the user
  explicitly asks for runtime remote loading.
- When adding a new fetched asset, document the source and validation behavior in
  `README.md`.

## Publishing Boundaries

- This repository targets GitHub Pages, with `public/CNAME` preserving
  `jacksonferguson.me`.
- Do not switch hosting providers, configure DNS, publish, push, or deploy unless
  the user explicitly asks for that action.
- A local build or preview is not publication.

## Git and Change Hygiene

- The working tree may contain untracked or user-authored changes. Do not revert
  or overwrite work you did not make.
- Keep edits tightly scoped to the request.
- Use conventional commit titles if the user asks for a commit.
- Do not commit generated `dist/`, `node_modules/`, or ignored `test-results/`
  artifacts.
- Before handing off, summarize what changed and which checks passed. If a check
  was skipped, say why.
