# Jackson Ferguson — Personal Website

The source for [jacksonferguson.me](https://jacksonferguson.me): my technical portfolio, photo journals, and creative archive. It brings together projects across software, infrastructure, hardware, and applied physics, alongside camping trips, live event sound, Blender scenes, and Python generative art.

## How it's made

The site is built with **Astro, TypeScript, and CSS**, with static HTML generated at build time. GitHub Actions builds and checks the site for GitHub Pages, using `jacksonferguson.me` as the canonical domain. There is no application server or database to run.

Astro components handle the shared layout, project cards, navigation, and galleries. Trip journals and creative collections live in Markdown with schema-validated metadata. Project descriptions, site metadata, and contact links are centralized in TypeScript so the pages and structured data share the same source.

JavaScript supports specific interactions: a Three.js hero animation, an Asciinema terminal recording, photo viewers, and copy buttons. Astro generates responsive image variants, while fonts and selected upstream project assets are served from the site itself.

## Remote project assets

[config/remote-assets.json](config/remote-assets.json) is the central manifest for assets sourced from other project repositories. [scripts/fetch-remote-assets.mjs](scripts/fetch-remote-assets.mjs) downloads and validates them, then writes the copies into `public/` for Astro to include in the static site. These generated copies are git-ignored; this repository tracks the fetching process rather than snapshots that can go stale.

| Asset ID                             | Source project                                                                         | Local target                                  | Validation                           |
| ------------------------------------ | -------------------------------------------------------------------------------------- | --------------------------------------------- | ------------------------------------ |
| `protostar-demo`                     | [Protostar](https://github.com/JacksonFergusonDev/protostar)                           | `public/protostar-demo.cast`                  | Asciinema v2 header and minimum size |
| `protostar-icon`                     | [Protostar](https://github.com/JacksonFergusonDev/protostar)                           | `public/images/protostar.svg`                 | SVG markup and minimum size          |
| `systems-audio-analysis`             | [Systems Audio Lab](https://github.com/JacksonFergusonDev/systems-audio-lab)           | `public/images/audio-analysis.svg`            | SVG markup and minimum size          |
| `data-science-redshift-distribution` | [Data Science Portfolio](https://github.com/JacksonFergusonDev/data-science-portfolio) | `public/images/gmm-redshift-distribution.svg` | SVG markup and minimum size          |

### Why fetch at build time?

Embedding these files directly from upstream would allow a live page to change without this repository's build, tests, or accessibility checks running. Fetching them first keeps the project repositories authoritative while making the deployed site a checked snapshot. Visitors load these embedded assets from the site's own origin; links to source repositories and full technical reports remain external.

The current sources follow upstream `main` branches, so rebuilding a portfolio commit can pick up newer assets. The fetcher logs SHA-256 hashes for the downloaded files; those hashes describe the fetched content rather than pinning its version.

### Fetching and validation

`npm run assets:fetch` runs the fetcher directly. Both `npm run dev` and `npm run build` invoke it automatically through npm pre-scripts. If a download remains unavailable after retries, or fails validation, the command fails before Astro starts.

Each manifest entry supplies a unique ID, a description, an HTTPS source, a unique target inside `public/`, a supported validation type, and a positive `minBytes` threshold. The type matches the asset format, and the size threshold helps catch empty or unexpectedly small responses. SVG checks look for opening and closing SVG markup; terminal recordings require a JSON Asciinema v2 header with numeric dimensions. These are format checks, not a full content audit.

Pages reference the generated local paths. The asset pipeline is checked through the fetch command, production build, and site tests.

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
