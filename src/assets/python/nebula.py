# -----------------------------------------------------------------------------
# Domain-Warped Cosmic Nebula
#
# Renders a nebula-like image as a 1920x1080 JPEG using NumPy for the noise.
# It generates a density field from layered value noise (fractional Brownian
# motion, fBM) whose sample coordinates are warped twice by more noise, which
# produces filaments and swirls. The field is then lit as a heightfield,
# colored with a palette, and finished with a vignette, film grain, and a
# slight blur. A fixed seed makes every run identical.
# -----------------------------------------------------------------------------

import matplotlib.colors as mcolors
import matplotlib.pyplot as plt
import numpy as np
from scipy.ndimage import gaussian_filter

# -----------------------------------------------------------------------------
# Parameters
# -----------------------------------------------------------------------------

# Canvas and resolution:
# Full HD at 100 DPI, with a fixed seed.
WIDTH, HEIGHT = 1920, 1080
DPI = 100
SEED = 42
OUTPUT_FILENAME = "nebula.jpg"
JPEG_QUALITY = 95

# First warp (large scale):
# Low-frequency, high-amplitude noise shifts the sample coordinates, which
# bends the cloud into broad currents. The Y_OFFSET pair shifts the second
# axis's noise so it differs from the first.
WARP1_OCTAVES = 4
WARP1_PERSISTENCE = 0.5
WARP1_LACUNARITY = 2.0
WARP1_BASE_SCALE = 500.0
WARP1_AMPLITUDE = 320.0
WARP1_Y_OFFSET = (73.1, 127.3)

# Second warp (small scale):
# A second noise pass, sampled at the already-warped coordinates, adds tight
# curls and sharp boundaries.
WARP2_OCTAVES = 5
WARP2_PERSISTENCE = 0.55
WARP2_LACUNARITY = 2.1
WARP2_BASE_SCALE = 180.0
WARP2_AMPLITUDE = 140.0
WARP2_Y_OFFSET = (-41.5, 91.2)

# Density field:
# Seven octaves of fBM give the fine detail. A log curve (LOG_DYNAMIC_RANGE
# sets its strength) keeps the densest areas from saturating.
GAS_OCTAVES = 7
GAS_PERSISTENCE = 0.6
GAS_LACUNARITY = 2.2
GAS_BASE_SCALE = 80.0
LOG_DYNAMIC_RANGE = 10.0

# Envelope:
# An elliptical Gaussian falloff confines the cloud near the center.
# ENVELOPE_FLOOR keeps a little density at the edges so they don't go fully
# black.
ENVELOPE_ASPECT = 1.6
ENVELOPE_SCALE_FACTOR = 0.55
ENVELOPE_RATE = 1.2
ENVELOPE_POWER = 2.0
ENVELOPE_FLOOR = 0.08

# Edge vignette:
# Darkens the edges slightly. Brightness never drops below EDGE_MIN_BRIGHTNESS.
EDGE_MIN_BRIGHTNESS = 0.65
EDGE_VIGNETTE_POWER = 2.0

# Lighting:
# The density map is treated as a heightfield. Surface normals from its
# gradient give diffuse and specular lighting from LIGHT_DIRECTION.
SURFACE_GRADIENT_STEP = 2.0
LIGHT_DIRECTION = np.array([0.5, 0.5, 0.707], dtype=np.float32)
DIFFUSE_BASE = 0.88
DIFFUSE_BOOST = 0.30
SPECULAR_POWER = 28.0
SPECULAR_STRENGTH = 0.30

# Post-processing:
GRAIN_INTENSITY = 0.06
GLOW_SIGMA = 0.6

# Color stops:
# Palette from low to high density, modeled on emission-nebula colors:
# violet, H-alpha red, orange, oxygen-blue cyan, then white.
COLOR_STOPS = [
    (0.00, "#150428"),  # Dark purple
    (0.10, "#28074d"),  # Violet
    (0.25, "#4d0e6b"),  # Magenta-purple
    (0.42, "#b8164a"),  # Crimson (H-alpha)
    (0.58, "#e86517"),  # Orange
    (0.72, "#1ea4e6"),  # Cyan (ionized oxygen)
    (0.90, "#e8f4fc"),  # Near-white
    (1.00, "#ffffff"),  # White
]

np.random.seed(SEED)


# -----------------------------------------------------------------------------
# Noise
# -----------------------------------------------------------------------------

def smoothstep(t):
    """
    Quintic ease curve, 6t^5 - 15t^4 + 10t^3. Its first and second derivatives
    are zero at t = 0 and 1, so the noise has no visible seams at grid lines.
    """
    return t * t * t * (t * (t * 6.0 - 15.0) + 10.0)


def numpy_noise_2d(X, Y, grid_size=64):
    """
    2D value noise in [0, 1], computed on whole arrays at once. Each integer
    grid corner gets a pseudo-random value from an integer hash, and points
    between corners are blended with smoothstep. grid_size is the cell width in
    pixels.
    """
    gx = X / grid_size
    gy = Y / grid_size

    x0 = np.floor(gx).astype(np.int32)
    x1 = x0 + 1
    y0 = np.floor(gy).astype(np.int32)
    y1 = y0 + 1

    tx = smoothstep(gx - x0)
    ty = smoothstep(gy - y0)

    def hash_coords(ix, iy):
        n = ix * 374761393 + iy * 668265263
        n = (n ^ (n >> 13)) * 1274126177
        return (n ^ (n >> 16)) & 0x7FFFFFFF

    h00 = hash_coords(x0, y0) / 0x7FFFFFFF
    h10 = hash_coords(x1, y0) / 0x7FFFFFFF
    h01 = hash_coords(x0, y1) / 0x7FFFFFFF
    h11 = hash_coords(x1, y1) / 0x7FFFFFFF

    nx0 = h00 * (1.0 - tx) + h10 * tx
    nx1 = h01 * (1.0 - tx) + h11 * tx
    return nx0 * (1.0 - ty) + nx1 * ty


def fbm_2d(X, Y, octaves=6, persistence=0.5, lacunarity=2.0, base_scale=200.0):
    """
    Fractional Brownian motion: the sum of `octaves` noise layers. Each layer's
    cells are `lacunarity` times smaller than the last, and its amplitude is
    `persistence` times the last.
    """
    total = np.zeros_like(X, dtype=np.float32)
    amplitude = 1.0
    freq_scale = base_scale

    for _ in range(octaves):
        total += numpy_noise_2d(X, Y, grid_size=freq_scale) * amplitude
        amplitude *= persistence
        freq_scale /= lacunarity

    return total


# -----------------------------------------------------------------------------
# Density Field
# -----------------------------------------------------------------------------

def generate_density_field(w, h):
    """
    Return an h x w density array scaled to [0, 1]. Two warp passes displace
    the coordinates, the final fBM is sampled there, and the elliptical
    envelope is applied last.
    """
    x = np.linspace(-w / 2.0, w / 2.0, w, dtype=np.float32)
    y = np.linspace(-h / 2.0, h / 2.0, h, dtype=np.float32)
    X, Y = np.meshgrid(x, y)

    # 1. First warp: large-scale offsets for each coordinate.
    q_x = fbm_2d(
        X,
        Y,
        octaves=WARP1_OCTAVES,
        persistence=WARP1_PERSISTENCE,
        lacunarity=WARP1_LACUNARITY,
        base_scale=WARP1_BASE_SCALE,
    )
    q_y = fbm_2d(
        X + WARP1_Y_OFFSET[0],
        Y + WARP1_Y_OFFSET[1],
        octaves=WARP1_OCTAVES,
        persistence=WARP1_PERSISTENCE,
        lacunarity=WARP1_LACUNARITY,
        base_scale=WARP1_BASE_SCALE,
    )

    q_x = (q_x - 0.5) * WARP1_AMPLITUDE
    q_y = (q_y - 0.5) * WARP1_AMPLITUDE

    # 2. Second warp: noise sampled at the first-warped coordinates.
    r_x = fbm_2d(
        X + q_x,
        Y + q_y,
        octaves=WARP2_OCTAVES,
        persistence=WARP2_PERSISTENCE,
        lacunarity=WARP2_LACUNARITY,
        base_scale=WARP2_BASE_SCALE,
    )
    r_y = fbm_2d(
        X + q_y + WARP2_Y_OFFSET[0],
        Y + q_x + WARP2_Y_OFFSET[1],
        octaves=WARP2_OCTAVES,
        persistence=WARP2_PERSISTENCE,
        lacunarity=WARP2_LACUNARITY,
        base_scale=WARP2_BASE_SCALE,
    )

    r_x = (r_x - 0.5) * WARP2_AMPLITUDE
    r_y = (r_y - 0.5) * WARP2_AMPLITUDE

    # 3. Density: the detailed fBM, sampled at the twice-warped coordinates.
    density = fbm_2d(
        X + r_x,
        Y + r_y,
        octaves=GAS_OCTAVES,
        persistence=GAS_PERSISTENCE,
        lacunarity=GAS_LACUNARITY,
        base_scale=GAS_BASE_SCALE,
    )
    density = np.log1p(density * LOG_DYNAMIC_RANGE)

    # 4. Envelope: elliptical falloff plus the density floor.
    radius = np.sqrt((X / ENVELOPE_ASPECT) ** 2 + Y**2)
    normalized_r = radius / (min(w, h) * ENVELOPE_SCALE_FACTOR)
    shape_falloff = np.exp(-ENVELOPE_RATE * (normalized_r**ENVELOPE_POWER))

    effective_envelope = ENVELOPE_FLOOR + (1.0 - ENVELOPE_FLOOR) * shape_falloff
    final_field = density * effective_envelope

    return (final_field - final_field.min()) / (np.ptp(final_field) + 1e-8)


# -----------------------------------------------------------------------------
# Shading and Color
# -----------------------------------------------------------------------------

def apply_color_mapping(density, w, h):
    """
    Return an h x w x 3 RGB array in [0, 1]. Colors come from the palette,
    then get diffuse and specular lighting, a vignette, and grain.
    """
    # Surface normals from the density gradient.
    dz_dy, dz_dx = np.gradient(density, SURFACE_GRADIENT_STEP, SURFACE_GRADIENT_STEP)
    norm = np.sqrt(dz_dx**2 + dz_dy**2 + 1.0)
    nx, ny, nz = -dz_dx / norm, -dz_dy / norm, 1.0 / norm

    light = LIGHT_DIRECTION / np.linalg.norm(LIGHT_DIRECTION)
    dot = np.clip(nx * light[0] + ny * light[1] + nz * light[2], 0.0, 1.0)
    specular = dot**SPECULAR_POWER

    # Palette as a colormap.
    positions = [c[0] for c in COLOR_STOPS]
    values = [mcolors.hex2color(c[1]) for c in COLOR_STOPS]
    nebula_cmap = mcolors.LinearSegmentedColormap.from_list(
        "nebula", list(zip(positions, values))
    )

    # Diffuse shading, then add the specular highlight.
    rgb = nebula_cmap(density)[..., :3]
    rgb *= np.clip((DIFFUSE_BASE + DIFFUSE_BOOST * dot)[..., np.newaxis], 0.0, 1.0)
    rgb = np.clip(rgb + specular[..., np.newaxis] * SPECULAR_STRENGTH, 0.0, 1.0)

    # Vignette: darken with distance from the center.
    x = np.linspace(-1.0, 1.0, w, dtype=np.float32)
    y = np.linspace(-1.0, 1.0, h, dtype=np.float32)
    X, Y = np.meshgrid(x, y)
    norm_dist = np.sqrt((X**2 + Y**2) / 2.0)

    vignette = 1.0 - (1.0 - EDGE_MIN_BRIGHTNESS) * np.clip(
        norm_dist**EDGE_VIGNETTE_POWER, 0.0, 1.0
    )
    rgb *= vignette[..., np.newaxis]

    # Film grain: multiply by Gaussian noise centered on 1.
    if GRAIN_INTENSITY > 0.0:
        grain = np.random.normal(1.0, GRAIN_INTENSITY, size=rgb.shape).astype(
            np.float32
        )
        rgb = np.clip(rgb * grain, 0.0, 1.0)

    return rgb


# -----------------------------------------------------------------------------
# Render
# -----------------------------------------------------------------------------

if __name__ == "__main__":
    density = generate_density_field(WIDTH, HEIGHT)
    rgb = apply_color_mapping(density, WIDTH, HEIGHT)

    # Light Gaussian blur to soften single-pixel noise.
    if GLOW_SIGMA > 0.0:
        rgb = gaussian_filter(rgb, sigma=GLOW_SIGMA, axes=(0, 1))

    bg_color = COLOR_STOPS[0][1]

    # Draw onto a borderless canvas that fills the figure.
    fig = plt.figure(figsize=(WIDTH / DPI, HEIGHT / DPI), dpi=DPI, facecolor=bg_color)
    ax = fig.add_axes([0, 0, 1, 1], frameon=False)
    ax.axis("off")

    ax.imshow(rgb, origin="lower", aspect="auto", interpolation="bicubic")

    # Save as a JPEG with 4:4:4 chroma subsampling (no color detail lost).
    plt.savefig(
        OUTPUT_FILENAME,
        format="jpg",
        dpi=DPI,
        facecolor=bg_color,
        edgecolor="none",
        pad_inches=0.0,
        pil_kwargs={"quality": JPEG_QUALITY, "subsampling": 0},
    )
    plt.show()
