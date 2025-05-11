import numpy as np
import pulp


def solve_assignment(
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

    # Build list of adjacent cell pairs (horizontal & vertical)
    pairs = []
    for i in range(n - 1):
        for j in range(n - 1):
            pairs.append(((i, j), (i + 1, j)))
            pairs.append(((i, j), (i, j + 1)))

    # Auxiliary vars z[p][k] to linearize |x1 - x2|
    z = pulp.LpVariable.dicts("z", (range(len(pairs)), range(m)), lowBound=0, upBound=1, cat=pulp.LpContinuous)

    # Linearization constraints
    for p, ((i1, j1), (i2, j2)) in enumerate(pairs):
        for k in range(m):
            prob += z[p][k] >= x[i1][j1][k] - x[i2][j2][k], f"z_ge_diff1_{p}_{k}"
            prob += z[p][k] >= x[i2][j2][k] - x[i1][j1][k], f"z_ge_diff2_{p}_{k}"

    # Objective: minimize total adjacency differences
    prob += pulp.lpSum(z[p][k] for p in range(len(pairs)) for k in range(m)), "Minimize_adj_diff"

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
