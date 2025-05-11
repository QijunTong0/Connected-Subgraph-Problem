import numpy as np
from mip import BINARY, CONTINUOUS, Model, xsum


def solve_assignment(
    grid: np.ndarray, requirements: np.ndarray, stone_budget: int = None, max_seconds: int = 30
) -> np.ndarray:
    """
    Solve the assignment problem via python-mip.

    Args:
        grid (np.ndarray): A 2D array representing the grid, where each cell contains a score.
        requirements (np.ndarray): A 1D array where each element represents the minimum score required for each player.
        stone_budget (int, optional): The maximum number of stones that can be placed on the grid. Defaults to None.
        max_seconds (int, optional): The maximum time allowed for solving the problem in seconds. Defaults to 30.

    Returns:
        np.ndarray: An n×n integer array representing the assignment matrix.
                    Each cell contains 0 (no stone) or a player index (1 to m).
    """
    n = grid.shape[0]
    m = requirements.size

    # Create the optimization model
    model = Model(sense="MIN")
    # model.verbose = 0

    # Decision variables x[i,j,k]
    x = [
        [[model.add_var(var_type=BINARY, name=f"x_{i}_{j}_{k}") for k in range(m)] for j in range(n)] for i in range(n)
    ]

    # Constraint: Each cell can hold at most one stone
    for i in range(n):
        for j in range(n):
            model.add_constr(xsum(x[i][j][k] for k in range(m)) <= 1)

    # Constraint: Each player's score must meet or exceed their requirement
    for k in range(m):
        model.add_constr(xsum(grid[i, j] * x[i][j][k] for i in range(n) for j in range(n)) >= requirements[k])
        model.add_constr(xsum(grid[i, j] * x[i][j][k] for i in range(n) for j in range(n)) <= requirements[k] * 1.2)

    # Constraint: Total number of stones must not exceed the stone budget (if provided)
    if stone_budget is not None:
        model.add_constr(xsum(x[i][j][k] for i in range(n) for j in range(n) for k in range(m)) <= stone_budget)

    # Bounding box variables for each player
    Xmin = [model.add_var(var_type=CONTINUOUS, lb=0, ub=n - 1, name=f"Xmin_{k}") for k in range(m)]
    Xmax = [model.add_var(var_type=CONTINUOUS, lb=0, ub=n - 1, name=f"Xmax_{k}") for k in range(m)]
    Ymin = [model.add_var(var_type=CONTINUOUS, lb=0, ub=n - 1, name=f"Ymin_{k}") for k in range(m)]
    Ymax = [model.add_var(var_type=CONTINUOUS, lb=0, ub=n - 1, name=f"Ymax_{k}") for k in range(m)]

    # Bounding box constraints
    for k in range(m):
        for i in range(n):
            for j in range(n):
                # If x=1 then Xmin <= i <= Xmax, Ymin <= j <= Ymax
                model.add_constr(Xmin[k] <= i + (1 - x[i][j][k]) * n)
                model.add_constr(Xmax[k] >= i - (1 - x[i][j][k]) * n)
                model.add_constr(Ymin[k] <= j + (1 - x[i][j][k]) * n)
                model.add_constr(Ymax[k] >= j - (1 - x[i][j][k]) * n)

    # Objective function: Minimize the range
    model.objective = xsum((Xmax[k] - Xmin[k]) + (Ymax[k] - Ymin[k]) for k in range(m))

    # Solve the problem
    _status = model.optimize(max_seconds=max_seconds)

    # Convert the result to an assignment matrix
    assignment = np.zeros((n, n), dtype=int)
    for i in range(n):
        for j in range(n):
            for k in range(m):
                if x[i][j][k].x >= 0.5:
                    assignment[i, j] = k + 1
    return assignment
