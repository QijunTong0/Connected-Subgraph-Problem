import io

import matplotlib.pyplot as plt
import numpy as np
from matplotlib import colors
from matplotlib.patches import Patch


def generate_data(
    n: int,
    m: int,
    cell_value_range: tuple[int, int] = (1, 9),
    req_range: tuple[int, int] | None = None,
    seed: int | None = None,
) -> tuple[np.ndarray, np.ndarray]:
    """
    Generate random input data for the assignment problem.

    Args:
        n (int): The dimension of the grid (n x n).
        m (int): The number of agents or requirements.
        cell_value_range (Tuple[int, int], optional): Range of cell values in the grid (inclusive). Defaults to (1, 9).
        req_range (Optional[Tuple[int, int]], optional): Range of requirement values (inclusive). Defaults to None.
        seed (Optional[int], optional): Seed for random number generation. Defaults to None.

    Returns:
        Tuple[np.ndarray, np.ndarray]: A tuple containing:
            - grid (np.ndarray): A n×n array of integers representing the grid.
            - requirements (np.ndarray): A length-m array of integers representing requirements.
    """
    if seed is not None:
        np.random.seed(seed)
    low, high = cell_value_range
    grid = np.random.randint(low, high + 1, size=(n, n))
    if req_range is None:
        req_low, req_high = 0, int(n * n * high / m)
    else:
        req_low, req_high = req_range
    requirements = np.random.randint(req_low, req_high + 1, size=m)
    return grid, requirements


def _build_figure(
    grid: np.ndarray,
    assignment: np.ndarray,
    requirements: np.ndarray,
    title: str,
) -> plt.Figure:
    """
    Build and return a matplotlib Figure for the assignment solution.
    Caller is responsible for closing the figure.

    Args:
        grid (np.ndarray): A n×n array of integers representing the grid.
        assignment (np.ndarray): A n×n array of integers in {0, 1, ..., m}.
        requirements (np.ndarray): A n array of integers representing requirements.
        title (str): Title of the visualization.

    Returns:
        plt.Figure: The constructed figure (not yet saved or closed).
    """
    n = grid.shape[0]
    m = assignment.max()
    base_colors = list(plt.cm.get_cmap("tab20").colors)
    colors_list = ["white"] + base_colors[:m]
    cmap = colors.ListedColormap(colors_list)

    fig, ax = plt.subplots(figsize=(6, 6))
    ax.pcolormesh(assignment, cmap=cmap, edgecolors="k", linewidth=0.5)
    for i in range(n):
        for j in range(n):
            ax.text(j + 0.5, i + 0.5, str(grid[i, j]), va="center", ha="center", alpha=0.25)
    ax.set_xticks([])
    ax.set_yticks([])
    ax.set_title(title)
    plt.gca().invert_yaxis()
    scores = []
    for k in range(1, m + 1):
        mask = assignment == k
        scores.append(int(np.sum(grid[mask])))
    handles = []
    for k in range(1, m + 1):
        label = f"P{k}: score={scores[k - 1]}, req={requirements[k - 1]}"
        handles.append(Patch(facecolor=colors_list[k], edgecolor="k", label=label))
    ax.legend(handles=handles, loc="center left", bbox_to_anchor=(1.02, 0.5), ncol=1, frameon=False)
    return fig


def figure_to_svg(
    grid: np.ndarray,
    assignment: np.ndarray,
    requirements: np.ndarray,
    title: str,
) -> str:
    """
    Render the assignment visualization as an SVG string (for web API use).

    Args:
        grid (np.ndarray): A n×n array of integers representing the grid.
        assignment (np.ndarray): A n×n array of integers in {0, 1, ..., m}.
        requirements (np.ndarray): A length-m array of integers representing requirements.
        title (str): Title of the visualization.

    Returns:
        str: Complete SVG document as a string.
    """
    fig = _build_figure(grid, assignment, requirements, title)
    buf = io.StringIO()
    fig.savefig(buf, format="svg", bbox_inches="tight")
    plt.close(fig)
    buf.seek(0)
    return buf.getvalue()


def visualize_solution(
    grid: np.ndarray,
    assignment: np.ndarray,
    requirements: np.ndarray,
    seconds: float,
    title: str,
    filename: str,
) -> None:
    """
    Visualize an assignment and save it to a file (for CLI use).

    Args:
        grid (np.ndarray): A n×n array of integers representing the grid.
        assignment (np.ndarray): A n×n array of integers in {0, 1, ..., m}, representing assignment of blocks to agents.
        requirements (np.ndarray): A n array of integers in {0, 1, ..., m}, representing requirement of agents.
        seconds (float): Time taken to compute the solution (in seconds).
        title (str): Title of the visualization.
        filename (str): The file path to save the visualization.

    Returns:
        None
    """
    full_title = f"{title}\n ({grid.shape[0] ** 2} blocks; {assignment.max()} agents; {seconds} seconds)"
    fig = _build_figure(grid, assignment, requirements, full_title)
    fig.savefig(filename, bbox_inches="tight")
    plt.close(fig)
