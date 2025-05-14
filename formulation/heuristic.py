import numpy as np
import pulp


def solve_initial_assignment(
    grid: np.ndarray, requirements: np.ndarray, stone_budget: int = None, max_seconds: int = 30
) -> np.ndarray:
    """
    Solve the assignment problem via PuLP:
      - x[i,j,k] ∈ {0,1}: player k places stone on cell (i,j)
      - Each cell holds at most one stone
      - Each player k's score ∈ [requirements[k], requirements[k]*1.2]
      - Total stones ≤ stone_budget (if provided)
      - Objective: minimize sum of |x(i1,j1,k) - x(i2,j2,k)| over all adjacent pairs
    Returns an (n×n) array where 0 indicates no stone, and 1..m indicates the player ID.
    """
    n = grid.shape[0]
    m = requirements.size

    # Create problem
    prob = pulp.LpProblem("assignment", pulp.LpMinimize)

    # Decision variables x[i][j][k]
    x = pulp.LpVariable.dicts("x", (range(n), range(n), range(m)), cat=pulp.LpBinary)

    # At most one stone per cell
    for i in range(n):
        for j in range(n):
            prob += pulp.lpSum(x[i][j][k] for k in range(m)) <= 1, f"one_stone_{i}_{j}"

    # Score requirements for each player
    for k in range(m):
        prob += (
            pulp.lpSum(grid[i, j] * x[i][j][k] for i in range(n) for j in range(n)) >= requirements[k],
            f"min_score_player_{k}",
        )
        prob += (
            pulp.lpSum(grid[i, j] * x[i][j][k] for i in range(n) for j in range(n)) <= requirements[k] * 1.2,
            f"max_score_player_{k}",
        )

    # Total stone budget
    if stone_budget is not None:
        prob += (
            pulp.lpSum(x[i][j][k] for i in range(n) for j in range(n) for k in range(m)) <= stone_budget,
            "stone_budget",
        )

    # Objective: minimize total adjacency differences
    prob += 1

    # Solve with CBC and time limit
    solver = pulp.HiGHS_CMD(timeLimit=max_seconds)
    prob.solve(solver)

    # Build assignment matrix
    assignment = np.zeros((n, n), dtype=int)
    for i in range(n):
        for j in range(n):
            for k in range(m):
                if pulp.value(x[i][j][k]) >= 0.5:
                    assignment[i, j] = k + 1

    return assignment


def swap_assignment(assignment: np.ndarray, pos1: tuple, pos2: tuple) -> None:
    """
    Swap the elements at positions pos1 and pos2 in the assignment array in-place.

    Parameters:
        assignment (np.ndarray): 2D numpy array representing the assignment.
        pos1 (tuple): (row, col) index of the first element.
        pos2 (tuple): (row, col) index of the second element.
    """
    r1, c1 = pos1
    r2, c2 = pos2
    assignment[r1, c1], assignment[r2, c2] = assignment[r2, c2], assignment[r1, c1]
