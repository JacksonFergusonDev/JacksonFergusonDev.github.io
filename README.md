# Jackson Ferguson — Personal Website

The source for [jacksonferguson.me](https://jacksonferguson.me): my technical portfolio, photo journals, and creative archive. It brings together projects across software, infrastructure, hardware, and applied physics, alongside camping trips, live event sound, Blender scenes, and Python generative art.

## How it's made

The site is built with **Astro, TypeScript, and CSS**, with static HTML generated at build time. GitHub Actions builds and checks the site for GitHub Pages, using `jacksonferguson.me` as the canonical domain. There is no application server or database to run.

Astro components handle the shared layout, project cards, navigation, and galleries. Trip journals and creative collections live in Markdown with schema-validated metadata. Project descriptions, site metadata, and contact links are centralized in TypeScript so the pages and structured data share the same source.

JavaScript supports specific interactions: a Three.js hero animation, an Asciinema terminal recording, photo viewers, and copy buttons. Astro generates responsive image variants, while fonts and selected upstream project assets are served from the site itself.

The New Computer Modern regular and italic WOFF2 files in `public/fonts/` are Latin and common-symbol subsets of the 7.1.1 OpenType fonts distributed with TeX Live 2026. They were generated with FontTools `pyftsubset` using `--unicodes='U+0000-024F,U+1E00-1EFF,U+2000-206F,U+20AC,U+2122,U+2200-22FF' --layout-features='*' --name-IDs='*' --name-languages='*' --flavor=woff2`. The original full fonts fail Chromium's font parser; the subsets retain the characters used by this site and load in the browser. The bundled GUST font license remains in `public/fonts/`.

## Visual system

The whole site uses one type scale. Each tier has a single size, defined as a custom property on `:root` in [house-style](https://github.com/JacksonFergusonDev/house-style)'s `tokens.css` (the journal tokens below stay in [`global.css`](src/styles/global.css)), and the tokens shrink together at the 560px breakpoint. Components refer to the tokens rather than setting their own sizes.

The palette, the fonts, the section markers and buttons, the terminal window, and the install box are shared with the project sites on subdomains through [house-style](https://github.com/JacksonFergusonDev/house-style), which `package.json` pins to a release tag. Change them there, tag a release, and move this site to the new tag.

| Tier    | Token        | Desktop / mobile | Used for                                                                          |
| ------- | ------------ | ---------------- | --------------------------------------------------------------------------------- |
| Display | —            | Hero only        | The name in the hero                                                              |
| H1      | `--fs-h1`    | 40–72px          | Subpage and 404 titles                                                            |
| Label   | `--fs-label` | 11px, mono       | Section markers, card eyebrows, tags, badges, figure labels                       |
| H2      | `--fs-h2`    | 32–45px          | Section headline                                                                  |
| H3      | `--fs-h3`    | 32px / 28px      | Card title (every project and Beyond card, Protostar included), metric values     |
| Lead    | `--fs-lead`  | 19px / 17px      | The one-line summary under a card title, the About lead, index page intros        |
| H4      | `--fs-h4`    | 18px / 17px      | Items inside a card or list: principles, thumbnails, resume cards, minor projects |
| Body    | `--fs-body`  | 16px             | All paragraphs                                                                    |
| UI      | `--fs-ui`    | 14px / 13px      | Buttons, text links, metric captions, photo captions                              |

Each major section opens with a short numbered marker (`01 / ABOUT`, `02 / PROJECTS`, `03 / BEYOND`, `04 / CONTACT`), followed by an H2 headline that says something the marker doesn't. Only sections are numbered. Card eyebrows are unnumbered labels such as `FEATURED PROJECT`, since card order already shows importance.

Content inside a section is grouped into cards with the same anatomy: eyebrow, H3 title, optional lead, body, supporting content (demo, metrics, figures, or a thumbnail grid), then actions. Thumbnails inside a card have no panel of their own, so cards are never nested inside cards.

Subpages follow the same system. Index pages (trips, creative) open with a `PageIntro`, and detail pages (a trip, a creative collection) open with an `ArticleHeader` that adds a breadcrumb; both use the H1 token. Collection links on the homepage and on the index pages are the same `ThumbnailCard` component. Blender and Python entries are `.project-card` cards with H3 titles. Subpages are not numbered, and neither are entry categories.

Journal text uses a second voice: New Computer Modern serif, for detail-page descriptions (`--fs-journal-lead`, 24px / 22px) and long-form `.prose` writing (`--fs-journal-body`, 20px / 19px). The serif runs smaller than DM Sans at the same size, so these tokens are larger than their sans equivalents. Headings inside prose stay in DM Sans on the H3 and journal-lead sizes.

## Remote project assets

[config/remote-assets.json](config/remote-assets.json) is the central manifest for assets sourced from other project repositories. [scripts/fetch-remote-assets.mjs](scripts/fetch-remote-assets.mjs) downloads and validates them, then writes the copies into `public/` for Astro to include in the static site. These generated copies are git-ignored; this repository tracks the fetching process rather than snapshots that can go stale.

| Asset ID                             | Source project                                                                                                                                                       | Local target                                              | Validation                           |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | ------------------------------------ |
| `protostar-demo`                     | [Protostar interactive init demo](https://github.com/JacksonFergusonDev/protostar/blob/main/docs/assets/demo_init_interactive.cast)                                  | `public/protostar-demo.cast`                              | Asciinema v2 header and minimum size |
| `protostar-icon`                     | [Protostar](https://github.com/JacksonFergusonDev/protostar)                                                                                                         | `public/images/protostar.svg`                             | SVG markup and minimum size          |
| `protostar-mutation-score`           | [Protostar mutation benchmarks](https://protostar.jacksonferguson.me/benchmarks/)                                                                                    | `public/data/protostar-mutation-score.json`               | JSON object with typed keys          |
| `systems-audio-analysis`             | [Systems Audio Lab](https://github.com/JacksonFergusonDev/systems-audio-lab)                                                                                         | `public/images/audio-analysis.svg`                        | SVG markup and minimum size          |
| `data-science-redshift-distribution` | [Data Science Portfolio](https://github.com/JacksonFergusonDev/data-science-portfolio)                                                                               | `public/images/gmm-redshift-distribution.svg`             | SVG markup and minimum size          |
| `systems-audio-report`               | [Systems Audio Lab technical report](https://github.com/JacksonFergusonDev/systems-audio-lab/blob/main/docs/systems_audio_tech_report.pdf)                           | `public/reports/systems-audio-lab-technical-report.pdf`   | PDF signature and minimum size       |
| `data-science-aco-2670-report`       | [ACO 2670 dark matter analysis report](https://github.com/JacksonFergusonDev/data-science-portfolio/blob/main/astrophysics/aco_2670_dark_matter_analysis_report.pdf) | `public/reports/aco-2670-dark-matter-analysis-report.pdf` | PDF signature and minimum size       |

### Why fetch at build time?

Embedding these files directly from upstream would allow a live page to change without this repository's build, tests, or accessibility checks running. Fetching them first keeps the project repositories authoritative while making the deployed site a checked snapshot. Visitors load these assets, including the full technical reports, from the site's own origin, where they open in the browser instead of downloading as `raw.githubusercontent.com` files do. Links to source repositories remain external.

The current sources follow upstream `main` branches, so rebuilding a portfolio commit can pick up newer assets. The fetcher logs SHA-256 hashes for the downloaded files; those hashes describe the fetched content rather than pinning its version.

### Fetching and validation

`npm run assets:fetch` runs the fetcher directly. Both `npm run dev` and `npm run build` invoke it automatically through npm pre-scripts. If a download remains unavailable after retries, or fails validation, the command fails before Astro starts. Outside CI, the fetcher instead keeps an existing local copy that still passes validation and prints a warning, so offline development keeps working. CI never has a local copy, so there a failed download always fails the build.

Each manifest entry supplies a unique ID, a description, an HTTPS source, a unique target inside `public/`, a supported validation type, and a positive `minBytes` threshold. The type matches the asset format, and the size threshold helps catch empty or unexpectedly small responses. SVG checks look for opening and closing SVG markup; terminal recordings require a JSON Asciinema v2 header with numeric dimensions; PDFs must start with the `%PDF-` signature. A `json` entry also declares a `shape` mapping each key the site reads to `string`, `number`, or `boolean`, and the fetched document must be an object whose keys have those types. These are format checks, not a full content audit.

Pages reference the generated local paths. The project catalog reads Protostar's mutation score file while the site builds, and the homepage shows the score linked to Protostar's benchmarks dashboard, so a new score appears on the next build. The asset pipeline is checked through the fetch command, production build, and site tests.

### Refreshes from source repositories

The [GitHub Actions workflow](.github/workflows/deploy.yml) refreshes remote assets on pushes and pull requests to `main`, manual `workflow_dispatch` runs, weekly scheduled builds, and `repository_dispatch` events named `remote-assets-updated`. The weekly build picks up upstream changes; the dispatch hook allows a source repository to request a rebuild immediately after changing an asset.

The source-side integration uses a GitHub Actions step like this:

```yaml
- name: Refresh portfolio remote assets
  env:
    GH_TOKEN: ${{ secrets.PORTFOLIO_DISPATCH_TOKEN }}
  run: |
    gh api repos/JacksonFergusonDev/JacksonFergusonDev.github.io/dispatches \
      --method POST \
      --field event_type=remote-assets-updated \
      --field 'client_payload[asset_source]=${{ github.repository }}' \
      --field 'client_payload[ref]=${{ github.ref }}'
```

`PORTFOLIO_DISPATCH_TOKEN` is a fine-grained token authorized to send repository dispatch events to this portfolio, stored as an Actions secret in the source repository. The hook rebuilds the site; it does not bypass its validation or deployment conditions.

## Build checks and hosting

The workflow uses Node.js 24 and installs dependencies from the npm lockfile. It runs a dependency audit, Prettier, ESLint, Stylelint, Astro's type checks, the production build, and tests against the generated site. Playwright and Axe check navigation, responsive layouts, gallery behavior, and accessibility on selected pages. Browser test artifacts are retained for seven days.

GitHub Pages receives the static `dist/` artifact, with the custom domain recorded in `public/CNAME`.

## Repository map

| Path                                                     | Purpose                                                  |
| -------------------------------------------------------- | -------------------------------------------------------- |
| [`src/pages/`](src/pages/)                               | Homepage, archive routes, sitemap, and `llms.txt`        |
| [`src/content/`](src/content/)                           | Trip and creative Markdown collections and their schemas |
| [`src/components/`](src/components/)                     | Shared interface components and interactive media        |
| [`src/layouts/`](src/layouts/)                           | Shared page structure, navigation, and metadata          |
| [`src/lib/`](src/lib/)                                   | Project descriptions, site metadata, and structured data |
| [`src/scripts/data-field.ts`](src/scripts/data-field.ts) | Three.js hero animation and motion controls              |
| [`src/styles/global.css`](src/styles/global.css)         | Typography, colour, spacing, and responsive layout       |
| [`src/assets/`](src/assets/)                             | Source photography, artwork, and creative code           |
| [`public/`](public/)                                     | Static downloads, fonts, favicon, and custom-domain file |
| [`config/`](config/) and [`scripts/`](scripts/)          | Remote asset manifest and build utilities                |
| [`tests/`](tests/)                                       | Generated-site, browser, and accessibility checks        |
