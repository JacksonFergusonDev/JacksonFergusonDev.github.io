# -----------------------------------------------------------------------------
# Spacetime Gravity Well
#
# Draws a wireframe grid bent by a central dip and sine ripples, in the style
# of spacetime-curvature diagrams. At the current settings the ripples dominate
# and the dip is shallow, so the result reads as a rippled surface more than a
# funnel. The surface is projected onto the page at a 60 degree tilt and drawn
# as pink lines on a dark background. Output is an 8x10 inch JPEG at 300 DPI.
# -----------------------------------------------------------------------------

import matplotlib.pyplot as plt
import numpy as np

# -----------------------------------------------------------------------------
# Aesthetics and Canvas Geometry
# -----------------------------------------------------------------------------

# Pink lines on a near-black violet background.
PALETTE = {
    "enclosure": "#08020F",
    "design": "#FF2A9D",
}

# 8x10 inches at 300 DPI (2400 x 3000 px).
CANVAS_WIDTH = 8.0
CANVAS_HEIGHT = 10.0
FIGSIZE = (CANVAS_WIDTH, CANVAS_HEIGHT)

LINE_WIDTH = 0.95
DPI = 300
OUTPUT_FILENAME = "gravity-well.jpg"

# Surface controls:
# WELL_DEPTH sets the depth of the dip, CHAOS_FACTOR how strongly the ripples
# distort it, FRAME_SIZE how much of the grid the dip covers, and
# GRID_DENSITY_X how many grid lines run across the width.
WELL_DEPTH = 0.35
CHAOS_FACTOR = 0.5
FRAME_SIZE = 0.7
GRID_DENSITY_X = 24


# -----------------------------------------------------------------------------
# Gravity Well Geometry and Projection
# -----------------------------------------------------------------------------

def get_bezel_well(
    target_w=8.0,
    target_h=10.0,
    grid_density_x=24,
    depth=1.5,
    irregularity=0.3,
    well_scale=0.65,
):
    """
    Build the wireframe and return (lines, limit_x), where each line is an
    (x, y) pair of arrays in projected 2D coordinates and limit_x is the half-
    width of the grid. The well is a super-Gaussian dip modulated by sine
    ripples at two scales.
    """
    lines = []

    # Grid limits:
    # Tilting the grid by 60 degrees shrinks its vertical extent by
    # cos(60 deg) = 0.5. The y range is stretched by 1 / cos(60 deg) so the
    # projected grid still has the 4:5 aspect ratio of the page.
    limit_x = 2.0
    tilt_angle = np.radians(60.0)
    perspective_correction = 1.0 / np.cos(tilt_angle)

    aspect_ratio = target_h / target_w
    limit_y = limit_x * aspect_ratio * perspective_correction

    rect_width = limit_x * well_scale
    rect_height = limit_y * well_scale

    # Grid spacing:
    # Spacing is the same along both axes. Each line has 200 samples, enough to
    # look smooth where the dip curves.
    x_span = limit_x * 2.0
    y_span = limit_y * 2.0
    spacing = x_span / grid_density_x
    grid_density_y = int(y_span / spacing)
    resolution = 200

    raw_lines = []

    # Lines running along y.
    for x in np.linspace(-limit_x, limit_x, grid_density_x):
        y = np.linspace(-limit_y, limit_y, resolution)
        raw_lines.append((np.full_like(y, x), y))

    # Lines running along x.
    for y in np.linspace(-limit_y, limit_y, grid_density_y):
        x = np.linspace(-limit_x, limit_x, resolution)
        raw_lines.append((x, np.full_like(x, y)))

    # Depth and projection:
    # A 6th-order super-Gaussian envelope keeps the grid flat outside the dip,
    # with a steep edge.
    for x_arr, y_arr in raw_lines:
        norm_x = x_arr / rect_width
        norm_y = y_arr / rect_height
        envelope = np.exp(-(norm_x**6 + norm_y**6))

        # Ripples: two sine products at different scales.
        noise = np.sin(3.0 * x_arr) * np.cos(2.5 * y_arr) + 0.4 * np.sin(
            7.0 * x_arr + 1.2
        ) * np.cos(6.0 * y_arr)

        z = -depth * envelope * (1.0 + (noise * irregularity))

        # Project (x, y, z) to 2D: depth z shifts the line along screen y.
        x_proj = x_arr
        y_proj = (y_arr * np.cos(tilt_angle)) + (z * np.sin(tilt_angle))

        lines.append((x_proj, y_proj))

    return lines, limit_x


# -----------------------------------------------------------------------------
# Render
# -----------------------------------------------------------------------------

if __name__ == "__main__":
    # Build the projected lines.
    gravity_lines, sim_limit_x = get_bezel_well(
        target_w=CANVAS_WIDTH,
        target_h=CANVAS_HEIGHT,
        grid_density_x=GRID_DENSITY_X,
        depth=WELL_DEPTH,
        irregularity=CHAOS_FACTOR,
        well_scale=FRAME_SIZE,
    )

    # Convert grid units to canvas inches, centered on the page.
    scale_factor = CANVAS_WIDTH / (sim_limit_x * 2.0)
    center_x = CANVAS_WIDTH / 2.0
    center_y = CANVAS_HEIGHT / 2.0

    # Canvas: 8x10 inches at 300 DPI.
    fig, ax = plt.subplots(figsize=FIGSIZE, dpi=DPI, facecolor=PALETTE["enclosure"])
    ax.set_facecolor(PALETTE["enclosure"])
    ax.set_aspect("equal")
    ax.axis("off")

    # Draw each line with round caps so crossings look clean.
    for x_raw, y_raw in gravity_lines:
        x_phys = (x_raw * scale_factor) + center_x
        y_phys = (y_raw * scale_factor) + center_y
        ax.plot(
            x_phys,
            y_phys,
            color=PALETTE["design"],
            linewidth=LINE_WIDTH,
            solid_capstyle="round",
        )

    ax.set_xlim(0, CANVAS_WIDTH)
    ax.set_ylim(0, CANVAS_HEIGHT)

    # Save as a JPEG, cropped to the drawing with 0.2 inch padding.
    plt.savefig(
        OUTPUT_FILENAME,
        format="jpg",
        dpi=DPI,
        facecolor=fig.get_facecolor(),
        edgecolor="none",
        bbox_inches="tight",
        pad_inches=0.2,
        pil_kwargs={"quality": 98, "subsampling": 0},
    )
    plt.close(fig)
