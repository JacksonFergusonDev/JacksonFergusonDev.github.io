import { site } from './site';
// Fetched by scripts/fetch-remote-assets.mjs, which checks its shape, before every build.
import protostarMutation from '../../public/data/protostar-mutation-score.json';
import protostarRollback from '../../public/data/protostar-rollback-faults.json';

interface Metric {
  value: string;
  /** Inline HTML, so units can use <sub>. */
  unit: string;
  /** Inline HTML, so symbols can use <sub>. */
  label: string;
}

export interface Project {
  name: string;
  /** Primary destination: the documentation when it exists, otherwise the repository. */
  url: string;
  repo: string;
  eyebrow: string;
  subtitle: string;
  description: string;
  tags: string[];
  /** Card title split over two lines on desktop. */
  titleLines?: [string, string];
  /** Extra context for llms.txt. */
  extra?: string;
  metrics?: Metric[];
  /** A self-hosted report from config/remote-assets.json. */
  report?: { href: string; label: string };
  /** A figure fetched through config/remote-assets.json, linked to where it is explained. */
  scores?: { label: string; value: string; href: string }[];
}

export interface ToolProject {
  name: string;
  kind: string;
  repo: string;
  url: string;
  description: string;
}

export const protostar = {
  name: 'Protostar',
  url: 'https://protostar.jacksonferguson.me/',
  repo: `${site.github}/protostar`,
  eyebrow: 'FEATURED PROJECT',
  subtitle: 'Python projects that stay up to date.',
  description:
    'Protostar sets up Python projects and keeps them current. You pick the tools, and it writes their configuration, commit hooks, and CI. When the template improves, it merges the update without overwriting your edits, and if a step fails, every file goes back to how it was.',
  extra: 'Flagship project. Docs index for LLMs: https://protostar.jacksonferguson.me/llms.txt.',
  tags: ['Python', 'Developer tooling', 'Structured merging'],
  scores: [
    {
      label: 'Engine mutation score',
      value: protostarMutation.message,
      href: 'https://protostar.jacksonferguson.me/metrics/',
    },
    {
      label: 'Rollback faults restored',
      value: protostarRollback.message,
      href: 'https://protostar.jacksonferguson.me/metrics/',
    },
  ],
} satisfies Project;

export const systemsAudioLab = {
  name: 'Systems Audio Lab',
  url: `${site.github}/systems-audio-lab`,
  repo: `${site.github}/systems-audio-lab`,
  eyebrow: 'HARDWARE → SOFTWARE',
  subtitle: 'The whole measurement chain, from circuit to analysis.',
  description:
    'Low-noise power, a CMOS overdrive circuit, a custom RP2040 acquisition instrument, and Python signal analysis. Built together to understand how circuit topology becomes sound.',
  tags: ['RP2040', 'Analog electronics', 'Python / DSP'],
  metrics: [
    { value: '97.8', unit: 'kSps', label: 'Calibrated sample rate' },
    { value: '1.3', unit: 'mV RMS', label: 'Measured read-noise floor' },
  ],
  report: {
    href: '/reports/systems-audio-lab-technical-report.pdf',
    label: 'Read the Full Technical Report (PDF)',
  },
} satisfies Project;

export const dataSciencePortfolio = {
  name: 'Data Science Portfolio',
  url: `${site.github}/data-science-portfolio`,
  repo: `${site.github}/data-science-portfolio`,
  eyebrow: 'ASTROPHYSICS & DATA',
  subtitle: 'Physical modeling from first principles.',
  description:
    'Python analyses in astrophysics, atmospheric science, and statistics. They estimate the dark matter in galaxy cluster ACO 2670 from SDSS galaxy velocities, reconstruct an exoplanet’s atmosphere from five descent probes’ measurements, and check Monte Carlo simulations against statistical theory.',
  tags: ['Astrophysics', 'Statistical inference', 'Scientific Python'],
  metrics: [
    {
      value: '291 ± 60',
      unit: 'M<sub>☉</sub>/L<sub>☉</sub>',
      label: 'Mass-to-light ratio (ACO 2670)',
    },
    { value: '932', unit: 'km/s', label: 'Velocity dispersion (σ<sub>v</sub>)' },
  ],
  report: {
    href: '/reports/aco-2670-dark-matter-analysis-report.pdf',
    label: 'Read the Technical Report (PDF)',
  },
} satisfies Project;

export const cicdRelease = {
  name: 'CI/CD & Release Infrastructure',
  url: `${site.github}/ci-cd-release-infrastructure`,
  repo: `${site.github}/ci-cd-release-infrastructure`,
  eyebrow: 'INFRASTRUCTURE',
  titleLines: ['CI/CD & Release', 'Infrastructure'],
  subtitle: 'Release policy belongs in one place.',
  description:
    'Reusable GitHub Actions workflows that release my Python projects: checks before each release, publishing to Git and PyPI, and keeping the Homebrew formula in step.',
  tags: ['GitHub Actions', 'Python', 'Homebrew'],
} satisfies Project;

export const starGround = {
  name: 'Star Ground',
  url: `${site.github}/star-ground`,
  repo: `${site.github}/star-ground`,
  eyebrow: 'HARDWARE LOGISTICS',
  subtitle: 'Dependency management, made physical.',
  description:
    'Turns messy bills of materials for electronics builds into a repeatable parts order: units normalized exactly, parts already on hand accounted for, and assembly guides ordered by component height.',
  tags: ['Python', 'Parsing', 'Property-based testing'],
} satisfies Project;

// In importance order, following the GitHub profile.
export const projects: Project[] = [
  protostar,
  systemsAudioLab,
  dataSciencePortfolio,
  cicdRelease,
  starGround,
];

export const tools: ToolProject[] = [
  {
    name: 'Git Pulsar',
    kind: 'DISTRIBUTED SYSTEMS',
    repo: 'git-pulsar',
    url: `${site.github}/git-pulsar`,
    description:
      'Backs up your work in progress separately from your commits, and brings it to another machine, without touching Git’s index.',
  },
  {
    name: 'Dark Matter',
    kind: 'GRAPH ANALYSIS',
    repo: 'dark-matter',
    url: `${site.github}/dark-matter`,
    description:
      'Dependency-aware storage and shared infrastructure analysis for Homebrew installations.',
  },
  {
    name: 'Focal',
    kind: 'DEVELOPER TOOLING',
    repo: 'focal',
    url: `${site.github}/focal`,
    description:
      'Gathers the parts of a codebase an LLM needs to see. Fast Unix tools handle the common cases, and Python handles structured work.',
  },
];
