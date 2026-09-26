---
type: python
title: 'Python Generative Art'
eyebrow: 'COMPUTATIONAL ART & MATHEMATICS'
description: 'I use Python to turn mathematical patterns into images, from warped nebulae to chaotic attractors. Each piece includes the runnable script behind it.'

pieces:
  # ---------------------------------------------------------------------------
  # 1. Domain-Warped Cosmic Nebula
  # ---------------------------------------------------------------------------
  - title: 'Domain-Warped Cosmic Nebula'
    category: '01 / FLUID SIMULATION'
    description: 'I built this nebula from layered noise fields, warping one pattern with another to pull the shapes into long, turbulent filaments. The result is a procedural illustration inspired by cosmic gas clouds.'
    image: ../../assets/python/nebula.jpg
    alt: 'Cosmic nebula simulation with filamentary gas clouds and domain-warped swirls in deep astronomy hues'
    filename: 'nebula.py'
    tags:
      - 'Domain Warping'
      - 'Fractional Brownian Motion'
      - 'Gaussian Filter'
      - 'SciPy'

  # ---------------------------------------------------------------------------
  # 2. Spacetime Gravity Well
  # ---------------------------------------------------------------------------
  - title: 'Spacetime Gravity Well'
    category: '02 / CURVED SPACETIME'
    description: 'I wanted to give a regular grid the shape of a gravity well. A simple depression and uneven ripples bend the lines into a warped surface, drawn in neon against a dark violet field.'
    image: ../../assets/python/gravity-well.jpg
    alt: 'Topological grid warping downward into a deep gravitational potential well in vibrant pink on dark violet'
    filename: 'gravity-well.py'
    tags:
      - 'General Relativity'
      - 'Geodesics'
      - 'Grid Warping'
      - 'Matplotlib'

  # ---------------------------------------------------------------------------
  # 3. Procedural Pulsar Landscape
  # ---------------------------------------------------------------------------
  - title: 'Procedural Pulsar Landscape'
    category: '03 / SIGNAL TOPOGRAPHY'
    description: 'Inspired by the repeating pulses of PSR B1919+21, I arranged 80 signal-like traces into a glowing landscape. Small oscillations and a shifting central peak give each line its own shape, while their overlap creates depth.'
    image: ../../assets/python/landscape.jpg
    alt: 'Stacked procedural signal lines resembling pulsar emissions and mountain topography in cyan against black'
    filename: 'landscape.py'
    tags:
      - 'Pulsar Signal'
      - 'Line Occlusion'
      - 'Noise Harmonics'
      - 'NumPy'

  # ---------------------------------------------------------------------------
  # 4. Clifford Strange Attractor
  # ---------------------------------------------------------------------------
  - title: 'Clifford Strange Attractor'
    category: '04 / CHAOTIC DYNAMICS'
    description: 'I sampled millions of starting points and followed each orbit through a Clifford map, then used point density to reveal the attractor’s shape. Compressing the density range brings out fine paths, while a warm color gradient makes the densest regions glow.'
    image: ../../assets/python/clifford-attractor.jpg
    alt: 'Clifford strange attractor with intricate curving manifolds rendered in warm thermal gold and purple'
    filename: 'clifford-attractor.py'
    tags:
      - 'Strange Attractors'
      - 'Monte Carlo'
      - 'Log Density'
      - 'NumPy'
---
