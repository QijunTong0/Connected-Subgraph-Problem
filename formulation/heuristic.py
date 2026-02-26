import logging
import time

import numpy as np

logger = logging.getLogger(__name__)


def initial_assignment(
    grid: np.ndarray,
    requirements: np.ndarray,
    max_seconds: int = 30,
) -> np.ndarray:
    """
      - x[i,j,k] ∈ {0,1}: player k places stone on cell (i,j)
      - Each cell holds at most one stone
      - Each player k's score ∈ [requirements[k], requirements[k]*1.2]
    Returns an (n×n) array where 0 indicates no stone, and 1..m indicates the player ID.
    """
    n = grid.shape[0]
    m = requirements.size

    assignment = np.zeros((n, n), dtype=int)
    upper_bounds = (requirements * 1.2).astype(int)
    scores = np.zeros(m, dtype=int)
    satisfied = np.zeros(m, dtype=bool)

    # Process cells in descending order of value
    sorted_indices = np.argsort(grid.flatten())[::-1]

    for flat_idx in sorted_indices:
        if satisfied.all():
            break

        row = flat_idx // n
        col = flat_idx % n
        value = grid[row, col]

        remaining_capacity = upper_bounds - scores
        remaining_need = requirements - scores

        # Eligible: still needs more score AND this cell fits within upper bound
        eligible = (~satisfied) & (remaining_need > 0) & (value <= remaining_capacity)

        if not eligible.any():
            continue

        # Assign to the player with the tightest remaining window (smallest remaining_capacity)
        capacity_for_choice = np.where(eligible, remaining_capacity, np.iinfo(np.int64).max)
        chosen_k = int(np.argmin(capacity_for_choice))

        assignment[row, col] = chosen_k + 1  # 1-indexed player ID
        scores[chosen_k] += value

        if scores[chosen_k] >= requirements[chosen_k]:
            satisfied[chosen_k] = True

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


def _total_edge_diff(assignment: np.ndarray) -> int:
    return int(
        np.sum(assignment[:, :-1] != assignment[:, 1:])
        + np.sum(assignment[:-1, :] != assignment[1:, :])
    )


def solve_assignment(grid: np.ndarray, requirements: np.ndarray, max_seconds: int = 30, max_iter=100000) -> np.ndarray:
    assignment = initial_assignment(grid, requirements, max_seconds=max_seconds)
    h, w = assignment.shape
    assign_num = len(requirements) + 1
    pos1 = np.column_stack((np.random.randint(0, h, size=max_iter), np.random.randint(1, w, size=max_iter)))
    pos2 = np.column_stack((np.random.randint(0, h, size=max_iter), np.random.randint(1, w, size=max_iter)))
    pos3 = np.column_stack((np.random.randint(0, h, size=max_iter), np.random.randint(1, w, size=max_iter)))
    assign_num = np.random.randint(0, assign_num + 1, size=max_iter)

    initial_edge_diff = _total_edge_diff(assignment)
    logger.info("local search started: max_iter=%d, initial edge_diff=%d", max_iter, initial_edge_diff)

    log_interval = max(1, max_iter // 10)
    start_time = time.time()

    for i in range(max_iter):
        try_swap_assignment(assignment, pos1[i], pos2[i])
        try_change_single_assigment(assignment, pos3[i], assign_num[i])

        if (i + 1) % log_interval == 0:
            elapsed = time.time() - start_time
            logger.info(
                "iter %d/%d (%3.0f%%) | elapsed %.1fs | edge_diff=%d",
                i + 1, max_iter, (i + 1) / max_iter * 100,
                elapsed, _total_edge_diff(assignment),
            )

    elapsed = time.time() - start_time
    final_edge_diff = _total_edge_diff(assignment)
    logger.info(
        "local search finished: elapsed %.1fs, edge_diff %d -> %d (improved by %d)",
        elapsed, initial_edge_diff, final_edge_diff, initial_edge_diff - final_edge_diff,
    )

    return assignment
