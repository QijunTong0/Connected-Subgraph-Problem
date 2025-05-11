
import matplotlib.pyplot as plt
import numpy as np
from matplotlib import colors


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


def visualize_solution(grid: np.ndarray, assignment: np.ndarray, seconds: float, filename: str) -> None:
    """
    Visualize an assignment.

    Args:
        grid (np.ndarray): A n×n array of integers representing the grid.
        assignment (np.ndarray): A n×n array of integers in {0, 1, ..., m}, representing assignment of blocks to agents.
        seconds (float): Time taken to compute the solution (in seconds).
        filename (str): The file path to save the visualization.

    Returns:
        None
    """
    n = grid.shape[0]
    m = assignment.max()
    base_colors = list(plt.cm.get_cmap("tab20").colors)
    cmap = colors.ListedColormap(["white"] + base_colors[:m])

    fig, ax = plt.subplots(figsize=(6, 6))
    ax.pcolormesh(assignment, cmap=cmap, edgecolors="k", linewidth=0.5)
    ax.set_xticks([])
    ax.set_yticks([])
    ax.set_title(f"Assignment Result\n ({n**2} blocks; {m} agents; {seconds} seconds)")
    plt.gca().invert_yaxis()
    # save to file
    plt.savefig(filename, bbox_inches="tight")
    plt.close(fig)
