import numpy as np
import matplotlib.pyplot as plt
from matplotlib import colors


def generate_data(n, m, cell_value_range=(1, 9), req_range=None, seed=None):
    """
    Generate random input data for the assignment problem.

    Returns:
      grid: n×n ndarray of ints
      requirements: length-m ndarray of ints
    """
    if seed is not None:
        np.random.seed(seed)
    low, high = cell_value_range
    grid = np.random.randint(low, high + 1, size=(n, n))
    if req_range is None:
        req_low, req_high = 0, int(n * n * high / m / 3)
    else:
        req_low, req_high = req_range
    requirements = np.random.randint(req_low, req_high + 1, size=m)
    return grid, requirements


def visualize_solution(grid, assignment, filename):
    """
    Visualize an assignment.

    assignment: n×n array of ints in {0,1,...,m}
    """
    n = grid.shape[0]
    m = assignment.max() + 1
    base_colors = list(plt.cm.get_cmap("tab20").colors)
    cmap = colors.ListedColormap(base_colors[:m])

    fig, ax = plt.subplots(figsize=(6, 6))
    ax.pcolormesh(assignment, cmap=cmap, edgecolors="k", linewidth=0.5)
    ax.set_xticks([])
    ax.set_yticks([])
    ax.set_title(f"Area Assignment ({n**2} blocks; {m} agents)")
    plt.gca().invert_yaxis()
    # save to file
    plt.savefig(filename, bbox_inches="tight")
    plt.close(fig)
