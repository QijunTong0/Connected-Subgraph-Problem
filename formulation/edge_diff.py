import numpy as np
from mip import BINARY, CONTINUOUS, Model, xsum


def solve_assignment(
    grid: np.ndarray, requirements: np.ndarray, stone_budget: int = None, max_seconds: int = 30
) -> np.ndarray:
    """
    Solve the assignment problem via python-mip:
      - x[i,j,k] ∈ {0,1}: player k places stone on cell (i,j)
      - Each cell holds at most one stone
      - Each player k's score ≥ requirements[k]
      - Each region has at least one stone (any player)
      - Total stones ≤ stone_budget (if provided)
    Objective: minimize total number of stones.

    Args:
        grid (np.ndarray): A 2D array representing the grid values.
        requirements (np.ndarray): A 1D array containing the score requirements for each player.
        stone_budget (int, optional): The maximum number of stones allowed. Defaults to None.
        max_seconds (int, optional): The maximum time allowed for the solver to run. Defaults to 30.

    Returns:
        np.ndarray: An n×n integer array where 0 indicates no stone, and 1..m indicates the player ID.
    """
    n = grid.shape[0]
    m = requirements.size

    # Create optimization model
    model = Model(sense="MIN")
    # model.verbose = 0

    # Variables x[i,j,k]
    x = [
        [[model.add_var(var_type=BINARY, name=f"x_{i}_{j}_{k}") for k in range(m)] for j in range(n)] for i in range(n)
    ]

    # At most one stone per cell
    for i in range(n):
        for j in range(n):
            model.add_constr(xsum(x[i][j][k] for k in range(m)) <= 1)

    # Each player's score requirements
    for k in range(m):
        model.add_constr(xsum(grid[i, j] * x[i][j][k] for i in range(n) for j in range(n)) >= requirements[k])
        model.add_constr(xsum(grid[i, j] * x[i][j][k] for i in range(n) for j in range(n)) <= requirements[k] * 1.2)

    # Stone budget constraint (if provided)
    if stone_budget is not None:
        model.add_constr(xsum(x[i][j][k] for i in range(n) for j in range(n) for k in range(m)) <= stone_budget)

    pairs = []
    for i in range(n - 1):
        for j in range(n - 1):
            pairs.append(((i, j), (i + 1, j)))
            pairs.append(((i, j), (i, j + 1)))

    # z[pair_idx, k]: Within a pair, both being the same player's stone results in 0
    z = {}
    for p, ((i1, j1), (i2, j2)) in enumerate(pairs):
        for k in range(m):
            z[p, k] = model.add_var(var_type=CONTINUOUS, name=f"z_{p}_{k}", ub=1)
            # Linearization: z <= x1, z <= x2, z >= x1 + x2 -1
            model.add_constr(z[p, k] >= x[i1][j1][k] - x[i2][j2][k])
            model.add_constr(z[p, k] >= x[i2][j2][k] - x[i1][j1][k])

    # Objective function: Minimize total number of stones
    model.objective = xsum(z.values())

    # Solve
    _status = model.optimize(max_seconds=max_seconds)

    # Convert results into an assignment matrix
    assignment = np.zeros((n, n), dtype=int)
    for i in range(n):
        for j in range(n):
            for k in range(m):
                if x[i][j][k].x >= 0.5:
                    assignment[i, j] = k + 1
    return assignment
