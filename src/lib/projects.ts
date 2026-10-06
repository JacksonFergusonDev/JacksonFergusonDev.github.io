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
  subtitle: 'A plan before a single side effect.',
  description:
    'Deterministic, transaction-aware scaffolding for modern Python projects. Protostar calculates the intended repository state first, then applies it through a separate execution engine with explicit failure and rollback semantics.',
  extra: 'Flagship project. Docs index for LLMs: https://protostar.jacksonferguson.me/llms.txt.',
  tags: ['Python', 'AST composition', 'Transaction engine'],
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
  subtitle: 'Own the entire measurement chain.',
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
    'Computational pipelines bridging theoretical astrophysics, atmospheric science, and statistical inference. Estimating galaxy cluster dark matter via virial kinematics, exoplanet atmospheres, and Monte Carlo transport.',
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
    'Reusable workflows handle pre-flight checks, atomic Git publication, and PyPI-to-Homebrew synchronization across Python projects.',
  tags: ['GitHub Actions', 'Python', 'Homebrew'],
} satisfies Project;

export const starGround = {
  name: 'Star Ground',
  url: `${site.github}/star-ground`,
  repo: `${site.github}/star-ground`,
  eyebrow: 'HARDWARE LOGISTICS',
  subtitle: 'Dependency management, made physical.',
  description:
    'Inconsistent bills of materials become a reproducible procurement pipeline. Exact unit normalization, inventory-aware sourcing, and assembly guides ordered by component height.',
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
      'Recoverable workspace history, independent of your commits. Immutable state capture and reconciliation across machines, without touching the active Git index.',
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
      'Focused codebase context for LLM-assisted development. Fast UNIX tools for common paths; Python for structured work.',
  },
];
