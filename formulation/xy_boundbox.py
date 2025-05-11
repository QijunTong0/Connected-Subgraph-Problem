import numpy as np
import pulp


def solve_assignment(
    grid: np.ndarray, requirements: np.ndarray, stone_budget: int = None, max_seconds: int = 30
) -> np.ndarray:
    """
    Solve the assignment problem via PuLP, with minimum enclosing bounding‐box objective.

    Args:
        grid (np.ndarray): n×n array of cell scores.
        requirements (np.ndarray): length‐m array of minimum scores per player.
        stone_budget (int, optional): max total stones. Defaults to None.
        max_seconds (int, optional): solver time limit in seconds. Defaults to 30.

    Returns:
        np.ndarray: n×n integer array. 0=no stone, 1..m=player index.
    """
    n = grid.shape[0]
    m = requirements.size

    # 1) Build problem
    prob = pulp.LpProblem("assignment_bbox", pulp.LpMinimize)

    # 2) Decision vars x[i,j,k] ∈ {0,1}
    x = pulp.LpVariable.dicts("x", (range(n), range(n), range(m)), cat=pulp.LpBinary)

    # 3) Each cell holds at most one stone
    for i in range(n):
        for j in range(n):
            prob += (pulp.lpSum(x[i][j][k] for k in range(m)) <= 1, f"one_stone_{i}_{j}")

    # 4) Score requirements per player
    for k in range(m):
        prob += (
            pulp.lpSum(grid[i, j] * x[i][j][k] for i in range(n) for j in range(n)) >= requirements[k],
            f"min_score_{k}",
        )
        prob += (
            pulp.lpSum(grid[i, j] * x[i][j][k] for i in range(n) for j in range(n)) <= requirements[k] * 1.2,
            f"max_score_{k}",
        )

    # 5) Total stone budget
    if stone_budget is not None:
        prob += (
            pulp.lpSum(x[i][j][k] for i in range(n) for j in range(n) for k in range(m)) <= stone_budget,
            "stone_budget",
        )

    # 6) Bounding‐box variables for each player
    Xmin = [pulp.LpVariable(f"Xmin_{k}", lowBound=0, upBound=n - 1, cat=pulp.LpContinuous) for k in range(m)]
    Xmax = [pulp.LpVariable(f"Xmax_{k}", lowBound=0, upBound=n - 1, cat=pulp.LpContinuous) for k in range(m)]
    Ymin = [pulp.LpVariable(f"Ymin_{k}", lowBound=0, upBound=n - 1, cat=pulp.LpContinuous) for k in range(m)]
    Ymax = [pulp.LpVariable(f"Ymax_{k}", lowBound=0, upBound=n - 1, cat=pulp.LpContinuous) for k in range(m)]
    # 7) Bounding‐box linearization
    #    If x[i,j,k]=1 then Xmin[k] ≤ i ≤ Xmax[k], Ymin[k] ≤ j ≤ Ymax[k]
    #    → Xmin[k] ≤ i + (1−x)*n,  Xmax[k] ≥ i − (1−x)*n, etc.
    for k in range(m):
        for i in range(n):
            for j in range(n):
                prob += Xmin[k] <= i + (1 - x[i][j][k]) * n, f"bbox_xmin_{k}_{i}_{j}"
                prob += Xmax[k] >= i - (1 - x[i][j][k]) * n, f"bbox_xmax_{k}_{i}_{j}"
                prob += Ymin[k] <= j + (1 - x[i][j][k]) * n, f"bbox_ymin_{k}_{i}_{j}"
                prob += Ymax[k] >= j - (1 - x[i][j][k]) * n, f"bbox_ymax_{k}_{i}_{j}"

    # 8) Objective: minimize total range sum
    prob += pulp.lpSum((Xmax[k] - Xmin[k]) + (Ymax[k] - Ymin[k]) for k in range(m)), "min_total_bbox_range"

    # 9) Solve with CBC and time limit
    solver = pulp.HiGHS_CMD(timeLimit=max_seconds, msg=False)
    prob.solve(solver)

    # 10) Extract assignment
    assignment = np.zeros((n, n), dtype=int)
    for i in range(n):
        for j in range(n):
            for k in range(m):
                if pulp.value(x[i][j][k]) >= 0.5:
                    assignment[i, j] = k + 1

    return assignment
