# Jackson Ferguson Portfolio Agent Guidelines

Guidelines for AI agents working on this Astro portfolio, journal, and photography archive.

## Project Purpose

- This is Jackson Ferguson's personal website for `jacksonferguson.me`.
- The site is a static Astro project deployed by GitHub Actions to GitHub Pages.
- Keep the site fast, quiet, technical, and personal. The visual style is dark, minimal, astronomy-adjacent, and cyan-accented.
- Protostar is the flagship project and should remain the most prominent and deeply explained project.

## Repository Layout

- `src/pages/index.astro`: landing page, project hierarchy, contact links, and homepage sections.
- `src/pages/trips/`: photo journal archive and gallery routes.
- `src/pages/creative/`: creative studio archive and routes for 3D scenes, generative Python, and live event sound.
- `src/content/trips/`: trip metadata and image lists.
- `src/content/creative/`: creative collections and Markdown write-ups.
- `src/content/config.ts`: Astro content collection schemas.
- `src/content.config.ts`: Astro content configuration re-export.
- `src/components/`: reusable Astro components, including the hero canvas, Asciinema demo, service icons, and gallery viewer.
- `src/layouts/`: base HTML document structure, shared header navigation, structured data, and footer.
- `src/scripts/data-field.ts`: homepage canvas interaction. It must respect reduced motion and pause work when offscreen.
- `src/styles/global.css`: global design system, responsive layout, and component styling.
- `src/lib/`: site metadata (`site.ts`), project catalog (`projects.ts`), and schema.org structured data (`structured-data.ts`).
- `public/`: static files copied through unchanged, including resumes, CNAME, fonts, and the site favicon. Some generated remote asset outputs are written here during development and build.
- `config/remote-assets.json`: central manifest for project assets fetched from upstream repositories at development and build time.
- `scripts/fetch-remote-assets.mjs`: validates the remote asset manifest, fetches the assets, and writes them into `public/`.
- `README.md`: repository overview, design decisions, and build-time project assets with source-repository rebuild triggers.

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
npm run images:prepare
npm run og:render
```

`npm run test:browser` expects a local preview or development server (`npx astro preview --host 127.0.0.1 --port 4322`). Install Chromium with `npx playwright install chromium` if the browser binary is missing.

## Verification Expectations

- For content-only edits, run at least `npm run lint`, `npm run check`, `npm run build`, and `npm test`.
- For layout, navigation, gallery, animation, or interactive media changes, also run `npm run test:browser` and inspect the relevant page in a browser.
- For broad formatting or many Markdown/CSS/Astro edits, run `npm run format:check`; use `npm run format` only when formatting drift is intentional.

## Design and UX Rules

- Preserve the first viewport as a strong personal signal for Jackson Ferguson.
- Keep the hero immersive and full-bleed. Do not put the hero text in a card.
- Maintain responsive behavior across narrow mobile, portrait tablet, desktop, and short landscape viewports.
- Respect reduced-motion preferences for animation and media autoplay.
- Avoid decorative clutter. Prefer precise typography, thin rules, real project artifacts, and subdued motion over heavy illustration.
- Use the existing icon/component patterns before introducing a new dependency.
- Keep project cards and repeated items accessible by keyboard and meaningful without JavaScript.
- Horizontal rules separating major numbered sections (between Hero, 01 / ABOUT, 02 / PROJECTS, 03 / BEYOND, and 04 / CONTACT) must extend full bleed to the edges of the screen. Rules inside a section (between minor project rows, or inside a card) must remain inset to the container width. Beyond subsections are separated by card gaps, not rules.

## Shared House Style

The palette, type scale, fonts, icons, section markers, buttons, terminal window, install box, and their scripts come from [house-style](https://github.com/JacksonFergusonDev/house-style), which `package.json` pins to a release tag and the project sites on subdomains share.

- Follow `node_modules/house-style/GUIDELINES.md`. It holds the design and writing rules every site follows, including which arrow icon a link takes and who each page is written for.
- Change a shared style in house-style, tag a release, then move this site to the new tag. Never override a shared rule here to work around it.
- Draw icons only with `Icon` and `ServiceIcon`, which inline house-style's `icons/`. A missing icon is added to house-style first.

## Writing

House-style's Writing section sets the voice every site shares: calm, clear, and precise, with the answer first, one claim per sentence, and no selling. On this site:

- **Write as "I".** It's a personal site.
- **The homepage and project cards are for a General audience:** hiring managers, coworkers, and engineers on a first look. Say what a project does and why it matters before how it's built, and link to its repository or docs for the rest.
- **A project card describes the project the way its own docs do.** Protostar's card uses Protostar's own description, not a different pitch.
- **Taglines are plain.** A card subtitle says what the project is for, in ordinary words, rather than a slogan.
- **Journal and creative pages keep the serif journal voice:** first person, concrete, and calm, describing what was there and what I did.
- **Never hard-wrap Markdown prose.** Each paragraph and list item is one line.

## Visual System Rules

The type scale and card anatomy are documented in the README "Visual system" section. Follow them on every page:

- Use the `--fs-*` tokens from house-style's `tokens.css` for every text size. Do not add raw `font-size` values or per-breakpoint size overrides for content text; adjust the token instead. Scoped `<style>` blocks in pages follow the same rule. The hero, contact headline, Protostar install widget, terminal demo, Python code panel, and gallery viewer controls are the only exceptions.
- Keep one size per tier: Label, H1, H2, H3, Lead, H4, Body, UI. Never add a text size below Body for paragraphs, even inside thumbnails or narrow cards.
- The serif (`var(--serif)`) is reserved for the journal voice: detail-page descriptions and `.prose` writing, sized with the `--fs-journal-*` tokens. Keep it; do not replace it with sans or spread it to headings and UI.
- Each section has one numbered marker (`NN / WORD`) and one H2 headline. The headline must not repeat the marker.
- Number homepage sections only. Card eyebrows, project rows, in-card items, subpages, and content categories (such as Blender and Python `category` frontmatter) stay unnumbered.
- All eyebrows use the shared `.eyebrow` style with no local size or color override.
- Group section content into `.project-card` cards: eyebrow, H3 title, optional lead or intro, body, supporting content, actions. All card titles share the H3 token, including Protostar. Items inside a card use H4 and must not have their own panel background or border.
- Use `ThumbnailCard` for any image link to a trip or creative collection, on the homepage and on index pages alike. Its title stays at H4 everywhere.
- Subpage titles use `PageIntro` (index pages) or `ArticleHeader` (detail pages); do not build a one-off page header.

## Content Rules

- Run `npm run og:render` after changing a trip or creative page's title, description, location, or date, and commit the PNGs in `public/images/og/`; each page's social card is rendered from them.
- Run `npm run images:prepare` on new photos in `src/assets/` before committing them. It caps their size and strips metadata such as GPS locations.
- Project importance follows the GitHub profile order and description depth: Protostar first, then Systems Audio Lab, Data Science Portfolio, CI/CD tooling, Star Ground, and the smaller/archive projects.
- Protostar links should emphasize its documentation and source. Its embedded Asciinema demo uses `public/protostar-demo.cast`.
- Most project headings and primary project actions should lead to their GitHub repositories unless the user requests a write-up-first flow.
- Technical articles are source-grounded summaries, not invented first-person postmortems.
- Keep resume PDFs in `public/resumes/` as downloadable static files.
- Do not change biography, education, measurements, dates, or project status unless you have a clear source or an explicit user correction.

## Remote Asset Rules

- `config/remote-assets.json` is the source list for build-time fetched upstream assets.
- Fetch remote project assets with `npm run assets:fetch`; normal development and production builds run this automatically.
- Reference the generated local `public/` paths from site pages and Markdown. Do not hot-link raw GitHub assets from visitor-facing markup unless the user explicitly asks for runtime remote loading.
- When adding a new fetched asset, document the source and validation behavior in `README.md`.

## Publishing Boundaries

- This repository targets GitHub Pages, with `public/CNAME` preserving `jacksonferguson.me`.
- Do not switch hosting providers, configure DNS, publish, push, or deploy unless the user explicitly asks for that action.
- A local build or preview is not publication.

## Git and Change Hygiene

- The working tree may contain untracked or user-authored changes. Do not revert or overwrite work you did not make.
- Keep edits tightly scoped to the request.
- Use conventional commit titles if the user asks for a commit.
- Do not commit generated `dist/`, `node_modules/`, or ignored `test-results/` artifacts.
- Before handing off, summarize what changed and which checks passed. If a check was skipped, say why.
