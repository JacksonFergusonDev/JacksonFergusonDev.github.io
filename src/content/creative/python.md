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
    category: 'PROCEDURAL TEXTURE'
    description: 'I built this nebula from layered noise fields, warping one pattern with another to pull the shapes into long, turbulent filaments. The result is a procedural illustration inspired by cosmic gas clouds.'
    image: ../../assets/python/nebula.jpg
    alt: 'Swirling nebula-like cloud with a blue and white core inside orange and red filaments, fading to purple at the edges'
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
    category: 'CURVED SPACETIME'
    description: 'I wanted to give a regular grid the shape of a gravity well. A shallow dip and uneven ripples bend the grid into a warped surface, tilted and drawn in pink against a dark violet field.'
    image: ../../assets/python/gravity-well.jpg
    alt: 'Pink wireframe grid on dark violet, with the horizontal lines rippling downward through the center'
    filename: 'gravity-well.py'
    tags:
      - 'Spacetime Diagrams'
      - 'Oblique Projection'
      - 'Grid Warping'
      - 'Matplotlib'

  # ---------------------------------------------------------------------------
  # 3. Procedural Pulsar Landscape
  # ---------------------------------------------------------------------------
  - title: 'Procedural Pulsar Landscape'
    category: 'SIGNAL TOPOGRAPHY'
    description: 'Inspired by the repeating pulses of PSR B1919+21, I arranged 80 signal-like traces into a stacked landscape. Small oscillations and a shifting central peak give each line its own shape, while their overlap suggests depth.'
    image: ../../assets/python/landscape.jpg
    alt: 'Stacked procedural signal lines resembling pulsar emissions and mountain topography in teal against near-black'
    filename: 'landscape.py'
    tags:
      - 'Pulsar Signal'
      - 'Stacked Traces'
      - 'Noise Harmonics'
      - 'NumPy'

  # ---------------------------------------------------------------------------
  # 4. Clifford Strange Attractor
  # ---------------------------------------------------------------------------
  - title: 'Clifford Strange Attractor'
    category: 'CHAOTIC DYNAMICS'
    description: 'I sampled millions of starting points and followed each orbit through a Clifford map, then used point density to reveal the attractor’s shape. Compressing the density range brings out fine paths, and a color gradient from violet to cyan marks the densest regions.'
    image: ../../assets/python/clifford-attractor.jpg
    alt: 'Clifford strange attractor: looping, folded ribbons in magenta with bright cyan edges on black'
    filename: 'clifford-attractor.py'
    tags:
      - 'Strange Attractors'
      - 'Monte Carlo'
      - 'Log Density'
      - 'NumPy'
---
