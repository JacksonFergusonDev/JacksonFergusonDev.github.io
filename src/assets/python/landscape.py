# -----------------------------------------------------------------------------
# Procedural Pulsar Landscape
#
# Draws 80 stacked signal traces in the style of Harold Craft's 1970 plot of
# pulsar PSR B1919+21. Each trace is a Gaussian envelope times a few sine
# harmonics plus a pulse peak that drifts from line to line. Each trace is also
# filled below with the background color, but the fills don't hide other
# traces (see render_landscape), so overlapping lines stay visible through each
# other. The result is an 8x10 inch JPEG at 300 DPI.
# -----------------------------------------------------------------------------

import matplotlib.pyplot as plt
import numpy as np

# -----------------------------------------------------------------------------
# Aesthetics and Styling
# -----------------------------------------------------------------------------

# Teal lines on a near-black background, matching the site palette.
PALETTE = {
    "background": "#0B0E14",
    "line": "#00FFC8",  # Teal
    "fill": "#0B0E14",  # Same as the background
}

# A fine stroke (0.9 pt) keeps overlapping peaks distinct at print resolution.
LINE_WIDTH = 0.9


# -----------------------------------------------------------------------------
# Signal Generation
# -----------------------------------------------------------------------------

def get_lines(n_lines=80, resolution=200, amplitude=0.15):
    """
    Return n_lines traces as (x, y) arrays, ordered bottom to top. Each trace
    is its baseline plus amplitude * envelope * (noise + pulse peak). The
    random seed is fixed, so the output is the same on every run.
    """
    lines = []
    x = np.linspace(-1, 1, resolution)
    np.random.seed(42)

    step = 2.0 / n_lines

    for i in range(n_lines):
        y_base = -1.0 + (i * step)

        # Gaussian envelope: activity peaks at the center and falls to the
        # baseline at the edges.
        envelope = np.exp(-4.0 * x**2)

        # Four sine harmonics with random phases and amplitudes scaled by
        # 1/frequency, standing in for the noise in a radio signal.
        noise = np.zeros_like(x)
        for freq in [3, 5, 9, 15]:
            phase = np.random.rand() * 2 * np.pi
            amp = np.random.rand() * 0.5 + 0.5
            noise += amp * (1.0 / freq) * np.sin(freq * 5 * x + phase)

        # The pulse peak moves sideways from line to line, which draws a
        # ridge that wanders across the plot.
        peak_drift = np.sin(i * 0.15) * 0.4
        main_peak = 1.5 * np.exp(-15 * (x - peak_drift) ** 2)

        intensity = amplitude * envelope * (noise + main_peak)
        y_final = y_base + intensity

        lines.append((x, y_final))

    return lines


# -----------------------------------------------------------------------------
# Render
# -----------------------------------------------------------------------------

def render_landscape(output_path="landscape.jpg", dpi=300):
    """
    Draw the traces from back to front and save a JPEG to output_path. Each
    curve gets a background-colored fill below it. All fills share zorder=1 and
    all lines zorder=2, so every line is drawn over every fill and no trace is
    hidden. Giving each trace its own increasing zorder would make the fills
    occlude the traces behind them.
    """
    lines = get_lines()

    fig, ax = plt.subplots(figsize=(8, 10), facecolor=PALETTE["background"])
    ax.set_facecolor(PALETTE["background"])

    # Bottom edge of each fill.
    y_floor = -2.0

    # Top trace (farthest) first, bottom trace (nearest) last.
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

    # Axis limits with a small margin around the traces.
    ax.set_xlim(-1.05, 1.05)
    ax.set_ylim(-1.15, 1.25)
    ax.axis("off")

    # Save as a JPEG, cropped to the drawing with 0.2 inch padding.
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
