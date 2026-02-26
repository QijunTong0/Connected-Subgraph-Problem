import numpy as np


def initial_assignment(
    grid: np.ndarray,
    requirements: np.ndarray,
) -> np.ndarray:
    """
      - x[i,j,k] ∈ {0,1}: player k places stone on cell (i,j)
      - Each cell holds at most one stone
      - Each player k's score ∈ [requirements[k], requirements[k]*1.2]
    Returns an (n×n) array where 0 indicates no stone, and 1..m indicates the player ID.
    """
    n = grid.shape[0]
    m = requirements.size

    # Build assignment matrix
    assignment = np.zeros((n, n), dtype=int)
    # FIXME:implement initial assignment

    return assignment


def try_swap_assignment(assignment: np.ndarray, pos1: tuple, pos2: tuple) -> bool:
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


def solve_assignment(grid: np.ndarray, requirements: np.ndarray, max_seconds: int = 30, max_iter=1000000) -> np.ndarray:
    assignment = initial_assignment(grid, requirements, max_seconds=max_seconds)
    h, w = assignment.shape
    assign_num = len(requirements) + 1
    pos1 = np.column_stack((np.random.randint(0, h, size=max_iter), np.random.randint(1, w, size=max_iter)))
    pos2 = np.column_stack((np.random.randint(0, h, size=max_iter), np.random.randint(1, w, size=max_iter)))
    pos3 = np.column_stack((np.random.randint(0, h, size=max_iter), np.random.randint(1, w, size=max_iter)))
    assign_num = np.random.randint(0, assign_num + 1, size=max_iter)
    for i in range(max_iter):
        try_swap_assignment(assignment, pos1[i], pos2[i])
        try_change_single_assigment(assignment, pos3[i], assign_num[i])
    return assignment
