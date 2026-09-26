# -----------------------------------------------------------------------------
# Spacetime Gravity Well
#
# I built this script to visualize a synthetic gravity well deformed by
# chaotic surface ripples. It projects a curved 3D coordinate mesh onto a
# 2D plane using an oblique perspective, capturing the look of general-
# relativistic spacetime illustrations on a dark obsidian substrate.
# -----------------------------------------------------------------------------

import matplotlib.pyplot as plt
import numpy as np

# -----------------------------------------------------------------------------
# Aesthetics and Canvas Geometry
# -----------------------------------------------------------------------------

# I use high-contrast electric neon pink on a deep obsidian violet substrate.
PALETTE = {
    "enclosure": "#08020F",
    "design": "#FF2A9D",
}

# I sized the canvas for an 8x10 inch print at 300 DPI (2400 x 3000 px).
CANVAS_WIDTH = 8.0
CANVAS_HEIGHT = 10.0
FIGSIZE = (CANVAS_WIDTH, CANVAS_HEIGHT)

LINE_WIDTH = 0.95
DPI = 300
OUTPUT_FILENAME = "gravity-well.jpg"

# Simulation controls:
# I tuned the depth and chaos factor to balance smooth gravitational curvature
# against turbulent surface perturbation.
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
    I generate the 3D wireframe mesh and project it into 2D screen coordinates.
    The well profile combines a steep super-Gaussian depression with multi-scale
    trigonometric noise.
    """
    lines = []

    # Coordinate limits and perspective correction:
    # Tilting the grid by 60 degrees compresses vertical dimension by cos(60 deg) = 0.5.
    # To preserve the target 4:5 aspect ratio on screen, I stretch the y-domain by sec(60 deg).
    limit_x = 2.0
    tilt_angle = np.radians(60.0)
    perspective_correction = 1.0 / np.cos(tilt_angle)

    aspect_ratio = target_h / target_w
    limit_y = limit_x * aspect_ratio * perspective_correction

    rect_width = limit_x * well_scale
    rect_height = limit_y * well_scale

    # Grid domain discretization:
    # I set spacing uniformly along both axes and sample curves densely enough
    # to avoid polygonal artifacts around the steep rim of the depression.
    x_span = limit_x * 2.0
    y_span = limit_y * 2.0
    spacing = x_span / grid_density_x
    grid_density_y = int(y_span / spacing)
    resolution = 200

    raw_lines = []

    # Longitudinal grid lines
    for x in np.linspace(-limit_x, limit_x, grid_density_x):
        y = np.linspace(-limit_y, limit_y, resolution)
        raw_lines.append((np.full_like(y, x), y))

    # Transverse grid lines
    for y in np.linspace(-limit_y, limit_y, grid_density_y):
        x = np.linspace(-limit_x, limit_x, resolution)
        raw_lines.append((x, np.full_like(x, y)))

    # Surface deformation and projection:
    # I use a 6th-order super-Gaussian envelope to keep the surrounding mesh flat
    # while concentrating curvature tightly around the center.
    for x_arr, y_arr in raw_lines:
        norm_x = x_arr / rect_width
        norm_y = y_arr / rect_height
        envelope = np.exp(-(norm_x**6 + norm_y**6))

        # Modulate the funnel with interference noise.
        noise = np.sin(3.0 * x_arr) * np.cos(2.5 * y_arr) + 0.4 * np.sin(
            7.0 * x_arr + 1.2
        ) * np.cos(6.0 * y_arr)

        z = -depth * envelope * (1.0 + (noise * irregularity))

        # I apply an affine oblique projection to collapse 3D (x, y, z) into 2D.
        x_proj = x_arr
        y_proj = (y_arr * np.cos(tilt_angle)) + (z * np.sin(tilt_angle))

        lines.append((x_proj, y_proj))

    return lines, limit_x


# -----------------------------------------------------------------------------
# Main Render Pipeline
# -----------------------------------------------------------------------------

if __name__ == "__main__":
    # Generate the projected wireframe geometry.
    gravity_lines, sim_limit_x = get_bezel_well(
        target_w=CANVAS_WIDTH,
        target_h=CANVAS_HEIGHT,
        grid_density_x=GRID_DENSITY_X,
        depth=WELL_DEPTH,
        irregularity=CHAOS_FACTOR,
        well_scale=FRAME_SIZE,
    )

    # I map simulation coordinates directly into physical canvas inches.
    scale_factor = CANVAS_WIDTH / (sim_limit_x * 2.0)
    center_x = CANVAS_WIDTH / 2.0
    center_y = CANVAS_HEIGHT / 2.0

    # Canvas setup: 8x10 inches at 300 DPI.
    fig, ax = plt.subplots(figsize=FIGSIZE, dpi=DPI, facecolor=PALETTE["enclosure"])
    ax.set_facecolor(PALETTE["enclosure"])
    ax.set_aspect("equal")
    ax.axis("off")

    # Draw wireframe traces with rounded caps for clean node junctions.
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

    # High-quality export with tight padding.
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
