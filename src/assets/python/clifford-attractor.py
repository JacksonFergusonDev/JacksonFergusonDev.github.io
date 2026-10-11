# -----------------------------------------------------------------------------
# Clifford Strange Attractor
#
# Renders a 2D Clifford strange attractor as a 1920x1080 JPEG. It iterates
# three million random starting points through the Clifford map, counts how
# often orbits land in each pixel with a 2D histogram, and colors the pixels by
# that count. The folded shape appears where orbits pile up.
# -----------------------------------------------------------------------------

import matplotlib.colors as mcolors
import matplotlib.pyplot as plt
import numpy as np

# -----------------------------------------------------------------------------
# Parameters and Output Settings
# -----------------------------------------------------------------------------

# 1080p canvas, 16:9.
WIDTH, HEIGHT = 1920, 1080
DPI = 100
OUTPUT_FILENAME = "clifford-attractor.jpg"
JPEG_QUALITY = 95

# This parameter set gives an asymmetrical, tightly folded ribbon with thin
# outer filaments and dense interior loops.
A, B, C, D = 1.4, 1.7, 1.2, 1.8

# Integration:
# All starting positions are iterated together. The first BURN_IN iterations
# are discarded so the recorded points lie on the attractor, not on the
# transient path toward it.
NUM_POINTS = 3_000_000
ITERATIONS = 60
BURN_IN = 25

# Color and exposure:
# Color and brightness use separate gamma curves. A color gamma below 1 moves
# the teal and cyan tones into mid-density regions. A brightness gamma above 1
# keeps contrast in the brightest cores.
COLOR_GAMMA = 0.90
BRIGHTNESS_GAMMA = 1.50
EXPOSURE = 2.30

# Weight of a square-root density term that keeps faint outer filaments
# visible without flattening the dense core.
FAINT_DETAIL_STRENGTH = 0.01


# -----------------------------------------------------------------------------
# Dynamics and Orbit Integration
# -----------------------------------------------------------------------------

def clifford_attractor(
    a,
    b,
    c,
    d,
    num_points=NUM_POINTS,
    iterations=ITERATIONS,
):
    """
    Iterate many orbits in parallel with NumPy and return the recorded x and y
    coordinates as flat arrays. Iterations before BURN_IN are not recorded.
    """
    print(f"Integrating Clifford orbit for a={a}, b={b}, c={c}, d={d}...")

    # Start uniformly inside the box [-2, 2] on both axes.
    x = np.random.uniform(-2.0, 2.0, num_points).astype(np.float32)
    y = np.random.uniform(-2.0, 2.0, num_points).astype(np.float32)

    history_x = []
    history_y = []

    for i in range(iterations):
        # The Clifford map.
        x_new = np.sin(a * y) + c * np.cos(a * x)
        y_new = np.sin(b * x) + d * np.cos(b * y)

        x, y = x_new, y_new

        # Record only after the burn-in.
        if i >= BURN_IN:
            history_x.append(x)
            history_y.append(y)

    return np.concatenate(history_x), np.concatenate(history_y)


# -----------------------------------------------------------------------------
# Colormap
# -----------------------------------------------------------------------------

def create_colormap():
    """
    Build the palette: black through violet and magenta, then blue, cyan, and
    lime, ending in gold and near-white. The hues are modeled on emission-
    nebula colors. At the current gamma and exposure the render only reaches
    cyan, so the image is magenta and cyan on black.
    """
    colors = [
        (0.00, "#000000"),  # Black
        (0.06, "#080018"),  # Near-black violet
        (0.14, "#16003d"),  # Indigo
        (0.24, "#350078"),  # Dark violet
        (0.34, "#7200b8"),  # Purple
        (0.44, "#cf00c8"),  # Magenta
        (0.53, "#ff2a9d"),  # Pink
        (0.61, "#8b5cff"),  # Lavender
        (0.68, "#26bfff"),  # Blue
        (0.77, "#20ead5"),  # Cyan
        (0.86, "#55ffbd"),  # Mint
        (0.93, "#d8ff78"),  # Lime
        (0.98, "#ffe56b"),  # Gold
        (1.00, "#fff8e7"),  # Near-white
    ]

    return mcolors.LinearSegmentedColormap.from_list(
        "psychedelic_ultraviolet",
        colors,
        N=1024,
    )


# -----------------------------------------------------------------------------
# Render
# -----------------------------------------------------------------------------

if __name__ == "__main__":
    x, y = clifford_attractor(A, B, C, D)

    # Give the histogram the canvas aspect ratio so the image is not stretched.
    aspect_ratio = WIDTH / HEIGHT
    y_lim = 3.2
    x_lim = y_lim * aspect_ratio

    hist, _, _ = np.histogram2d(
        y,
        x,
        bins=[HEIGHT, WIDTH],
        range=[
            [-y_lim, y_lim],
            [-x_lim, x_lim],
        ],
    )

    # Counts span several orders of magnitude. log1p compresses them so faint
    # filaments and dense ridges are both visible.
    density = np.log1p(hist.astype(np.float32))
    density /= density.max() + 1e-8

    # Color and brightness come from separate curves, so the palette spreads
    # across the midtones without overexposing the image.
    color_density = np.power(density, COLOR_GAMMA)
    brightness = np.power(density, BRIGHTNESS_GAMMA)

    # Blend in the square-root term to lift faint filaments.
    faint_detail = np.sqrt(density)
    brightness = (
        FAINT_DETAIL_STRENGTH * faint_detail
        + (1.0 - FAINT_DETAIL_STRENGTH) * brightness
    )

    # Look up colors, then scale by brightness and exposure.
    cm = create_colormap()
    rgb = cm(color_density)[..., :3].astype(np.float32)
    rgb *= brightness[..., None]
    rgb *= EXPOSURE
    rgb = np.clip(rgb, 0.0, 1.0)

    # Draw onto a borderless canvas that fills the figure.
    fig = plt.figure(
        figsize=(WIDTH / DPI, HEIGHT / DPI),
        dpi=DPI,
        facecolor="black",
    )

    ax = fig.add_axes([0, 0, 1, 1], frameon=False)
    ax.axis("off")

    ax.imshow(
        rgb,
        origin="lower",
        aspect="auto",
        interpolation="bicubic",
    )

    # Save as a JPEG with 4:4:4 chroma subsampling (no color detail lost).
    plt.savefig(
        OUTPUT_FILENAME,
        format="jpg",
        dpi=DPI,
        facecolor="black",
        edgecolor="none",
        pad_inches=0.0,
        pil_kwargs={
            "quality": JPEG_QUALITY,
            "subsampling": 0,
        },
    )

    plt.close()

    print(f"Render exported successfully -> {OUTPUT_FILENAME} ({WIDTH}x{HEIGHT})")
