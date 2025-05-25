import numpy as np
import pulp
from tqdm import tqdm
import numba


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

    # Solve with HiGHS and time limit
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


def try_swap_assignment(assignment: np.ndarray, pos1: tuple, pos2: tuple) -> None:
    """
    Swap the elements at positions pos1 and pos2 in the assignment array in-place.

    Parameters:
        assignment (np.ndarray): 2D numpy array representing the assignment.
        pos1 (tuple): (row, col) index of the first element.
        pos2 (tuple): (row, col) index of the second element.
    """
    r1, c1 = pos1
    r2, c2 = pos2
    curr_score = calc_local_score(assignment, r1, c1) + calc_local_score(assignment, r2, c2)
    assignment[r1, c1], assignment[r2, c2] = assignment[r2, c2], assignment[r1, c1]
    next_score = calc_local_score(assignment, r1, c1) + calc_local_score(assignment, r2, c2)
    if next_score >= curr_score:
        assignment[r1, c1], assignment[r2, c2] = assignment[r2, c2], assignment[r1, c1]
        return False
    else:
        return True


def try_change_single_assigment(assignment: np.ndarray, pos: tuple, new_value: int) -> bool:
    """
    Randomly change the assignment at position pos to a different value from possible_values.
    If the total local score (for pos and its neighbors) is reduced, keep the change and return True.
    Otherwise, revert and return False.

    Parameters:
        assignment (np.ndarray): 2D numpy array representing the assignment.
        pos (tuple): (row, col) index of the element to change.
        possible_values (list or np.ndarray): List/array of possible values to assign.

    Returns:
        bool: True if the change is kept (score reduced), False otherwise.
    """

    r, c = pos
    old_value = assignment[r, c]
    # Exclude the current value from possible choices
    # Get affected positions: pos and its four neighbors
    curr_score = calc_local_score(assignment, r, c)
    # Apply new value
    assignment[r, c] = new_value
    # Compute new total local score
    new_score = calc_local_score(assignment, r, c)
    if new_score < curr_score:
        return True
    else:
        assignment[r, c] = old_value
        return False


@numba.njit
def calc_local_score(assignment: np.ndarray, r: int, c: int) -> int:
    h, w = assignment.shape
    score = 0
    # Use explicit bounds checking for Numba compatibility
    if c + 1 < w:
        score += assignment[r, c] != assignment[r, c + 1]
    if c - 1 >= 0:
        score += assignment[r, c] != assignment[r, c - 1]
    if r + 1 < h:
        score += assignment[r, c] != assignment[r + 1, c]
    if r - 1 >= 0:
        score += assignment[r, c] != assignment[r - 1, c]
    return score


def solve_assignment(
    grid: np.ndarray, requirements: np.ndarray, stone_budget: int = None, max_seconds: int = 30, max_iter=1000000
) -> np.ndarray:
    assignment = solve_initial_assignment(grid, requirements, max_seconds=max_seconds)
    h, w = assignment.shape
    assign_num = len(requirements) + 1
    pos1 = np.column_stack((np.random.randint(0, h, size=max_iter), np.random.randint(1, w, size=max_iter)))
    pos2 = np.column_stack((np.random.randint(0, h, size=max_iter), np.random.randint(1, w, size=max_iter)))
    pos3 = np.column_stack((np.random.randint(0, h, size=max_iter), np.random.randint(1, w, size=max_iter)))
    assign_num = np.random.randint(0, assign_num + 1, size=max_iter)
    for i in tqdm(range(max_iter)):
        try_swap_assignment(assignment, pos1[i], pos2[i])
        try_change_single_assigment(assignment, pos3[i], assign_num[i])
    return assignment
