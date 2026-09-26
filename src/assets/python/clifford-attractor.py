# -----------------------------------------------------------------------------
# Clifford Strange Attractor
#
# I use this script to integrate and render a 2D Clifford strange attractor.
# By tracking millions of iterations across a dense Monte Carlo sample and
# accumulating visits into a 2D histogram, the folded manifold emerges
# naturally from chaotic orbit density.
# -----------------------------------------------------------------------------

import matplotlib.colors as mcolors
import matplotlib.pyplot as plt
import numpy as np

# -----------------------------------------------------------------------------
# Parameters and Output Settings
# -----------------------------------------------------------------------------

# I target a standard 1080p canvas with a 16:9 aspect ratio.
WIDTH, HEIGHT = 1920, 1080
DPI = 100
OUTPUT_FILENAME = "clifford-attractor.jpg"
JPEG_QUALITY = 95

# I chose this parameter set because it produces an asymmetrical, tightly
# folded ribbon with both delicate outer filaments and dense interior loops.
A, B, C, D = 1.4, 1.7, 1.2, 1.8

# Monte Carlo integration parameters:
# I sample 3 million starting positions and iterate them simultaneously.
# The burn-in period lets trajectories converge onto the attractor manifold
# before I begin recording coordinates.
NUM_POINTS = 3_000_000
ITERATIONS = 60
BURN_IN = 25

# Color and exposure shaping:
# I tune color distribution and brightness separately. A slightly lower color
# gamma pushes cooler teal and cyan tones farther into mid-density regions,
# while a higher brightness gamma maintains contrast across the brightest cores.
COLOR_GAMMA = 0.90
BRIGHTNESS_GAMMA = 1.50
EXPOSURE = 2.30

# I mix in a small square-root density term to keep faint outer filaments
# visible without flattening the dense core structures.
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
    I integrate multiple chaotic orbits in parallel using NumPy.
    Discarding initial iterations ensures the collected points belong to
    the attractor manifold rather than transient starting states.
    """
    print(f"Integrating Clifford orbit for a={a}, b={b}, c={c}, d={d}...")

    # I initialize uniformly across the bounding box [-2, 2].
    x = np.random.uniform(-2.0, 2.0, num_points).astype(np.float32)
    y = np.random.uniform(-2.0, 2.0, num_points).astype(np.float32)

    history_x = []
    history_y = []

    for i in range(iterations):
        # Coupled sinusoidal recurrence relation defining the Clifford map.
        x_new = np.sin(a * y) + c * np.cos(a * x)
        y_new = np.sin(b * x) + d * np.cos(b * y)

        x, y = x_new, y_new

        # I only record coordinates once the trajectory has settled.
        if i >= BURN_IN:
            history_x.append(x)
            history_y.append(y)

    return np.concatenate(history_x), np.concatenate(history_y)


# -----------------------------------------------------------------------------
# Colormap
# -----------------------------------------------------------------------------

def create_colormap():
    """
    I designed this palette to mirror an astrophysical emission spectrum:
    starting in deep midnight violet, advancing through ultraviolet and magenta,
    and peaking in ionized cyan, acid lime, and incandescent core gold.
    """
    colors = [
        (0.00, "#000000"),  # Void
        (0.06, "#080018"),  # Midnight violet
        (0.14, "#16003d"),  # Deep indigo
        (0.24, "#350078"),  # Ultraviolet
        (0.34, "#7200b8"),  # Electric purple
        (0.44, "#cf00c8"),  # Psychedelic magenta
        (0.53, "#ff2a9d"),  # Hot pink
        (0.61, "#8b5cff"),  # Electric lavender
        (0.68, "#26bfff"),  # Electric blue
        (0.77, "#20ead5"),  # Neon cyan
        (0.86, "#55ffbd"),  # Aqua / mint
        (0.93, "#d8ff78"),  # Acid lime
        (0.98, "#ffe56b"),  # Solar gold
        (1.00, "#fff8e7"),  # Incandescent core
    ]

    return mcolors.LinearSegmentedColormap.from_list(
        "psychedelic_ultraviolet",
        colors,
        N=1024,
    )


# -----------------------------------------------------------------------------
# Main Render Pipeline
# -----------------------------------------------------------------------------

if __name__ == "__main__":
    x, y = clifford_attractor(A, B, C, D)

    # I match histogram bounds to the 16:9 canvas aspect ratio so the
    # geometry fills the frame without non-uniform stretching.
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

    # Point counts span multiple orders of magnitude. I apply log1p
    # compression to reveal faint filament paths alongside dense ridges.
    density = np.log1p(hist.astype(np.float32))
    density /= density.max() + 1e-8

    # I decouple color density from luminance so I can distribute palette
    # hues across the midtones without overexposing the image.
    color_density = np.power(density, COLOR_GAMMA)
    brightness = np.power(density, BRIGHTNESS_GAMMA)

    # Blend faint filament visibility.
    faint_detail = np.sqrt(density)
    brightness = (
        FAINT_DETAIL_STRENGTH * faint_detail
        + (1.0 - FAINT_DETAIL_STRENGTH) * brightness
    )

    # Map colors and modulate by luminance.
    cm = create_colormap()
    rgb = cm(color_density)[..., :3].astype(np.float32)
    rgb *= brightness[..., None]
    rgb *= EXPOSURE
    rgb = np.clip(rgb, 0.0, 1.0)

    # Render directly to a borderless Matplotlib canvas.
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

    # Export to high-quality JPEG with 4:4:4 chroma subsampling.
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
