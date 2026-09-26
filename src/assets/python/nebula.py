# -----------------------------------------------------------------------------
# Domain-Warped Cosmic Nebula
#
# I built this script to synthesize deep-space emission nebulae using pure
# NumPy. Rather than relying on external image libraries for noise, I
# implement vectorized 2D gradient noise and stack two stages of domain-
# warped fractional Brownian motion to sculpt realistic gas filaments and
# turbulent eddies.
# -----------------------------------------------------------------------------

import matplotlib.colors as mcolors
import matplotlib.pyplot as plt
import numpy as np
from scipy.ndimage import gaussian_filter

# -----------------------------------------------------------------------------
# Simulation Parameters and Knobs
# -----------------------------------------------------------------------------

# Canvas and resolution:
# I target full-HD (1920x1080) at 100 DPI with a fixed seed for reproducible runs.
WIDTH, HEIGHT = 1920, 1080
DPI = 100
SEED = 42
OUTPUT_FILENAME = "nebula.jpg"
JPEG_QUALITY = 95

# Domain warping - Layer 1 (Macro drift and large-scale eddies):
# I displace the coordinate space with low-frequency, high-amplitude noise
# to create broad directional currents across the nebula.
WARP1_OCTAVES = 4
WARP1_PERSISTENCE = 0.5
WARP1_LACUNARITY = 2.0
WARP1_BASE_SCALE = 500.0
WARP1_AMPLITUDE = 320.0
WARP1_Y_OFFSET = (73.1, 127.3)

# Domain warping - Layer 2 (Filament shear and vorticity):
# Feeding the warped coordinates into a second noise pass produces tight,
# curling tendrils and turbulent shear boundaries.
WARP2_OCTAVES = 5
WARP2_PERSISTENCE = 0.55
WARP2_LACUNARITY = 2.1
WARP2_BASE_SCALE = 180.0
WARP2_AMPLITUDE = 140.0
WARP2_Y_OFFSET = (-41.5, 91.2)

# High-frequency gas density field:
# I sample seven octaves of fractional Brownian motion for fine wisps,
# then apply log dynamic-range compression so dense shocks don't blow out.
GAS_OCTAVES = 7
GAS_PERSISTENCE = 0.6
GAS_LACUNARITY = 2.2
GAS_BASE_SCALE = 80.0
LOG_DYNAMIC_RANGE = 10.0

# Spatial envelope:
# I apply an elliptical Gaussian falloff to shape the cloud. An envelope floor
# keeps faint background haze from fading to absolute black at the periphery.
ENVELOPE_ASPECT = 1.6
ENVELOPE_SCALE_FACTOR = 0.55
ENVELOPE_RATE = 1.2
ENVELOPE_POWER = 2.0
ENVELOPE_FLOOR = 0.08

# Edge vignette:
# I introduce subtle edge darkening to frame the composition without clipping.
EDGE_MIN_BRIGHTNESS = 0.65
EDGE_VIGNETTE_POWER = 2.0

# Shading and grazing illumination:
# I treat the 2D density map as a topological heightfield, calculating surface
# normals to cast directional diffuse light and subtle specular highlights.
SURFACE_GRADIENT_STEP = 2.0
LIGHT_DIRECTION = np.array([0.5, 0.5, 0.707], dtype=np.float32)
DIFFUSE_BASE = 0.88
DIFFUSE_BOOST = 0.30
SPECULAR_POWER = 28.0
SPECULAR_STRENGTH = 0.30

# Optical post-processing:
GRAIN_INTENSITY = 0.06
GLOW_SIGMA = 0.6

# Color stops:
# I mapped these hues to astrophysical emission spectra: ambient violet,
# H-alpha crimson, shock-front orange, and ionized oxygen cyan.
COLOR_STOPS = [
    (0.00, "#150428"),  # Deep ambient purple base
    (0.10, "#28074d"),  # Mid-deep violet
    (0.25, "#4d0e6b"),  # Magenta-tinged purple
    (0.42, "#b8164a"),  # Crimson / H-alpha ridge
    (0.58, "#e86517"),  # Warm shock front orange
    (0.72, "#1ea4e6"),  # Ionized oxygen cyan
    (0.90, "#e8f4fc"),  # Core stellar highlight
    (1.00, "#ffffff"),  # Peak saturation
]

np.random.seed(SEED)


# -----------------------------------------------------------------------------
# Vectorized Noise Engine
# -----------------------------------------------------------------------------

def smoothstep(t):
    """
    I use a quintic polynomial for C2-continuous Hermite interpolation.
    This eliminates grid-line derivative discontinuities in the noise field.
    """
    return t * t * t * (t * (t * 6.0 - 15.0) + 10.0)


def numpy_noise_2d(X, Y, grid_size=64):
    """
    I vectorized a 2D integer-hash value noise generator directly in NumPy.
    This avoids external compiled C dependencies while maintaining high throughput.
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
    I sum successive octaves of noise, scaling frequency by lacunarity and
    diminishing amplitude by persistence to build self-similar fractal textures.
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
# Density Field Synthesis
# -----------------------------------------------------------------------------

def generate_density_field(w, h):
    """
    I synthesize the gas cloud by chaining two domain-warping passes into
    a high-octave fBM evaluation, then shaping the result with an elliptical envelope.
    """
    x = np.linspace(-w / 2.0, w / 2.0, w, dtype=np.float32)
    y = np.linspace(-h / 2.0, h / 2.0, h, dtype=np.float32)
    X, Y = np.meshgrid(x, y)

    # 1. Macro coordinate deformation:
    # I sample large-scale vector offsets to pull the grid into broad drift patterns.
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

    # 2. Filament shear and vorticity:
    # I evaluate an intermediate noise field on top of the first displacement.
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

    # 3. Turbulent gas evaluation:
    # I sample the high-frequency density texture using the warped coordinate field.
    density = fbm_2d(
        X + r_x,
        Y + r_y,
        octaves=GAS_OCTAVES,
        persistence=GAS_PERSISTENCE,
        lacunarity=GAS_LACUNARITY,
        base_scale=GAS_BASE_SCALE,
    )
    density = np.log1p(density * LOG_DYNAMIC_RANGE)

    # 4. Spatial envelope:
    # I constrain the nebula within an elliptical boundary while preserving
    # an ambient density floor so outer gas remains visible.
    radius = np.sqrt((X / ENVELOPE_ASPECT) ** 2 + Y**2)
    normalized_r = radius / (min(w, h) * ENVELOPE_SCALE_FACTOR)
    shape_falloff = np.exp(-ENVELOPE_RATE * (normalized_r**ENVELOPE_POWER))

    effective_envelope = ENVELOPE_FLOOR + (1.0 - ENVELOPE_FLOOR) * shape_falloff
    final_field = density * effective_envelope

    return (final_field - final_field.min()) / (np.ptp(final_field) + 1e-8)


# -----------------------------------------------------------------------------
# Shading, Colormapping, and Post-Processing
# -----------------------------------------------------------------------------

def apply_color_mapping(density, w, h):
    """
    I compute surface gradients across the density field to estimate 3D normals,
    apply Blinn-Phong lighting, and map densities onto the color palette.
    """
    # Numerical surface normal estimation from density gradients.
    dz_dy, dz_dx = np.gradient(density, SURFACE_GRADIENT_STEP, SURFACE_GRADIENT_STEP)
    norm = np.sqrt(dz_dx**2 + dz_dy**2 + 1.0)
    nx, ny, nz = -dz_dx / norm, -dz_dy / norm, 1.0 / norm

    light = LIGHT_DIRECTION / np.linalg.norm(LIGHT_DIRECTION)
    dot = np.clip(nx * light[0] + ny * light[1] + nz * light[2], 0.0, 1.0)
    specular = dot**SPECULAR_POWER

    # Colormap interpolation.
    positions = [c[0] for c in COLOR_STOPS]
    values = [mcolors.hex2color(c[1]) for c in COLOR_STOPS]
    nebula_cmap = mcolors.LinearSegmentedColormap.from_list(
        "nebula", list(zip(positions, values))
    )

    # Apply diffuse shading and grazing specular highlights.
    rgb = nebula_cmap(density)[..., :3]
    rgb *= np.clip((DIFFUSE_BASE + DIFFUSE_BOOST * dot)[..., np.newaxis], 0.0, 1.0)
    rgb = np.clip(rgb + specular[..., np.newaxis] * SPECULAR_STRENGTH, 0.0, 1.0)

    # Radial vignette to gently darken outer margins.
    x = np.linspace(-1.0, 1.0, w, dtype=np.float32)
    y = np.linspace(-1.0, 1.0, h, dtype=np.float32)
    X, Y = np.meshgrid(x, y)
    norm_dist = np.sqrt((X**2 + Y**2) / 2.0)

    vignette = 1.0 - (1.0 - EDGE_MIN_BRIGHTNESS) * np.clip(
        norm_dist**EDGE_VIGNETTE_POWER, 0.0, 1.0
    )
    rgb *= vignette[..., np.newaxis]

    # Star dust grain overlay.
    if GRAIN_INTENSITY > 0.0:
        grain = np.random.normal(1.0, GRAIN_INTENSITY, size=rgb.shape).astype(
            np.float32
        )
        rgb = np.clip(rgb * grain, 0.0, 1.0)

    return rgb


# -----------------------------------------------------------------------------
# Main Render Pipeline
# -----------------------------------------------------------------------------

if __name__ == "__main__":
    density = generate_density_field(WIDTH, HEIGHT)
    rgb = apply_color_mapping(density, WIDTH, HEIGHT)

    # A subtle Gaussian blur softens single-pixel high-frequency noise.
    if GLOW_SIGMA > 0.0:
        rgb = gaussian_filter(rgb, sigma=GLOW_SIGMA, axes=(0, 1))

    bg_color = COLOR_STOPS[0][1]

    # Render directly to a borderless 1080p canvas.
    fig = plt.figure(figsize=(WIDTH / DPI, HEIGHT / DPI), dpi=DPI, facecolor=bg_color)
    ax = fig.add_axes([0, 0, 1, 1], frameon=False)
    ax.axis("off")

    ax.imshow(rgb, origin="lower", aspect="auto", interpolation="bicubic")

    # High-quality JPEG export with Pillow subsampling disabled.
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
