# -----------------------------------------------------------------------------
# Procedural Pulsar Landscape
#
# I created this script to generate stacked signal topography inspired by
# Harold Craft's iconic radio pulse plots of pulsar PSR B1919+21. By layering
# procedural scan lines from back to front with occluding fills, simple
# periodic harmonics create an illusion of three-dimensional depth.
# -----------------------------------------------------------------------------

import matplotlib.pyplot as plt
import numpy as np

# -----------------------------------------------------------------------------
# Aesthetics and Styling
# -----------------------------------------------------------------------------

# I use high-energy ionized teal lines against a deep space obsidian background,
# matching the palette across my site.
PALETTE = {
    "background": "#0B0E14",
    "line": "#00FFC8",  # High-energy teal emission line
    "fill": "#0B0E14",  # Matches background for painter's occlusion
}

# I keep the stroke relatively fine (0.9 pt) so overlapping peaks remain
# crisp when rendered at print resolution.
LINE_WIDTH = 0.9


# -----------------------------------------------------------------------------
# Procedural Signal Synthesis
# -----------------------------------------------------------------------------

def get_lines(n_lines=80, resolution=200, amplitude=0.15):
    """
    I synthesize 80 individual signal traces. Each trace combines a localized
    Gaussian envelope, multi-frequency sinusoidal flutter, and a drifting
    central pulse peak.
    """
    lines = []
    x = np.linspace(-1, 1, resolution)
    np.random.seed(42)

    step = 2.0 / n_lines

    for i in range(n_lines):
        y_base = -1.0 + (i * step)

        # I apply a Gaussian envelope so signal activity concentrates in the
        # center and decays cleanly to baseline at the margins.
        envelope = np.exp(-4.0 * x**2)

        # I layer four sinusoidal harmonics with randomized phases and
        # 1/f amplitude scaling to mimic radio frequency jitter.
        noise = np.zeros_like(x)
        for freq in [3, 5, 9, 15]:
            phase = np.random.rand() * 2 * np.pi
            amp = np.random.rand() * 0.5 + 0.5
            noise += amp * (1.0 / freq) * np.sin(freq * 5 * x + phase)

        # I drift the main pulse peak laterally across successive slices,
        # creating a continuous ridge that wanders through the landscape.
        peak_drift = np.sin(i * 0.15) * 0.4
        main_peak = 1.5 * np.exp(-15 * (x - peak_drift) ** 2)

        intensity = amplitude * envelope * (noise + main_peak)
        y_final = y_base + intensity

        lines.append((x, y_final))

    return lines


# -----------------------------------------------------------------------------
# Main Render Pipeline
# -----------------------------------------------------------------------------

def render_landscape(output_path="landscape.jpg", dpi=300):
    """
    I render the traces from back to front. Filling the area beneath each
    curve with the background color occludes lines farther back, producing
    a pseudo-3D ridge plot without requiring a 3D renderer.
    """
    lines = get_lines()

    fig, ax = plt.subplots(figsize=(8, 10), facecolor=PALETTE["background"])
    ax.set_facecolor(PALETTE["background"])

    # Floor boundary for the occlusion polygon.
    y_floor = -2.0

    # Draw from top (farthest) to bottom (foreground)
    for x, y in reversed(lines):
        ax.fill_between(
            x,
            y,
            y_floor,
            color=PALETTE["fill"],
            zorder=1,
        )
        ax.plot(
            x,
            y,
            color=PALETTE["line"],
            linewidth=LINE_WIDTH,
            solid_capstyle="round",
            zorder=2,
        )

    # Frame bounds with proportional margin
    ax.set_xlim(-1.05, 1.05)
    ax.set_ylim(-1.15, 1.25)
    ax.axis("off")

    # High-quality JPEG export with tight margins.
    plt.savefig(
        output_path,
        format="jpg",
        dpi=dpi,
        facecolor=fig.get_facecolor(),
        edgecolor="none",
        bbox_inches="tight",
        pad_inches=0.2,
        pil_kwargs={"quality": 95, "subsampling": 0},
    )
    plt.close(fig)


if __name__ == "__main__":
    render_landscape()
