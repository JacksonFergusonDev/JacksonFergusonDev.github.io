import { site } from './site';

export interface Project {
  name: string;
  url: string;
  repo: string;
  description: string;
  extra?: string;
  eyebrow?: string;
  subtitle?: string;
  titleLines?: [string, string];
  tags?: string[];
}

export interface ToolProject {
  name: string;
  kind: string;
  repo: string;
  url: string;
  description: string;
}

export const projects: Project[] = [
  {
    name: 'Protostar',
    url: 'https://protostar.jacksonferguson.me/',
    repo: `${site.github}/protostar`,
    subtitle: 'A plan before a single side effect.',
    description:
      'Deterministic, transaction-aware scaffolding for modern Python projects. Protostar calculates the intended repository state first, then applies it through a separate execution engine with explicit failure and rollback semantics.',
    extra: 'Flagship project. Docs index for LLMs: https://protostar.jacksonferguson.me/llms.txt.',
    tags: ['Python', 'AST composition', 'Transaction engine'],
  },
  {
    name: 'Systems Audio Lab',
    url: `${site.github}/systems-audio-lab`,
    repo: `${site.github}/systems-audio-lab`,
    eyebrow: 'HARDWARE → SOFTWARE',
    subtitle: 'Own the entire measurement chain.',
    description:
      'Low-noise power, a CMOS overdrive circuit, a custom RP2040 acquisition instrument, and Python signal analysis. Built together to understand how circuit topology becomes sound.',
    tags: ['RP2040', 'Analog electronics', 'Python / DSP'],
  },
  {
    name: 'Data Science Portfolio',
    url: `${site.github}/data-science-portfolio`,
    repo: `${site.github}/data-science-portfolio`,
    eyebrow: 'ASTROPHYSICS & DATA',
    subtitle: 'Physical modeling from first principles.',
    description:
      'Computational pipelines bridging theoretical astrophysics, atmospheric science, and statistical inference. Estimating galaxy cluster dark matter via virial kinematics, exoplanet atmospheres, and Monte Carlo transport.',
    tags: ['Astrophysics', 'Statistical inference', 'Scientific Python'],
  },
  {
    name: 'CI/CD & Release Infrastructure',
    url: `${site.github}/ci-cd-release-infrastructure`,
    repo: `${site.github}/ci-cd-release-infrastructure`,
    eyebrow: 'INFRASTRUCTURE',
    titleLines: ['CI/CD & Release', 'Infrastructure'],
    subtitle: 'Release policy belongs in one place.',
    description:
      'Reusable workflows handle pre-flight checks, atomic Git publication, and PyPI-to-Homebrew synchronization across Python projects.',
    tags: ['GitHub Actions', 'Python', 'Homebrew'],
  },
  {
    name: 'Star Ground',
    url: `${site.github}/star-ground`,
    repo: `${site.github}/star-ground`,
    eyebrow: 'HARDWARE LOGISTICS',
    subtitle: 'Dependency management, made physical.',
    description:
      'Inconsistent bills of materials become a reproducible procurement pipeline. Exact unit normalization, inventory-aware sourcing, and assembly guides ordered by component height.',
    tags: ['Python', 'Parsing', 'Property-based testing'],
  },
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

export const [protostar, systemsAudioLab, dataSciencePortfolio, cicdRelease, starGround] = projects;
