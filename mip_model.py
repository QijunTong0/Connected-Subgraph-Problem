# file: mip_model.py
import numpy as np
from mip import Model, xsum, BINARY,CONTINUOUS, OptimizationStatus

def solve_assignment(grid: np.ndarray,
                     requirements: np.ndarray,
                     stone_budget: int = None):
    """
    Solve the assignment problem via python-mip:
      - x[i,j,k] ∈ {0,1}: player k places stone on cell (i,j)
      - Each cell holds at most one stone
      - Each player k's score ≥ requirements[k]
      - Each region has at least one stone (any player)
      - Total stones ≤ stone_budget (if provided)
    Objective: minimize total number of stones.
    Returns:
      assignment: n×n int array (0=none, 1..m=player)
    """
    n = grid.shape[0]
    m = requirements.size

    # モデル作成
    model = Model(sense='MIN')

    # 変数 x[i,j,k]
    x = [[[model.add_var(var_type=BINARY, name=f"x_{i}_{j}_{k}") 
           for k in range(m)] for j in range(n)] for i in range(n)]

    # 各セルに一石
    for i in range(n):
        for j in range(n):
            model.add_constr(xsum(x[i][j][k] for k in range(m)) ==1)

    # 各プレイヤの得点要件
    for k in range(m):
        model.add_constr(
            xsum(grid[i,j] * x[i][j][k] for i in range(n) for j in range(n))
            >= requirements[k]
        )

    # 石数予算制約（あれば）
    if stone_budget is not None:
        model.add_constr(
            xsum(x[i][j][k] for i in range(n) for j in range(n) for k in range(m))
            <= stone_budget
        )

    pairs = []
    for i in range(n-1):
        for j in range(n-1):
            if i+1 < n:
                pairs.append(((i,j),(i+1,j)))
            if j+1 < n:
                pairs.append(((i,j),(i,j+1)))
    # z[pair_idx, k]: ペア内で両方同じプレイヤ k が置かれると0
    z = {}
    for p, ((i1,j1),(i2,j2)) in enumerate(pairs):
        for k in range(m):
            z[p,k] = model.add_var(var_type=CONTINUOUS, name=f"z_{p}_{k}",ub=1)
            # linearization: z <= x1, z <= x2, z >= x1 + x2 -1
            model.add_constr(z[p,k] >= x[i1][j1][k]-x[i2][j2][k])
            model.add_constr(z[p,k] >= x[i2][j2][k]-x[i1][j1][k])
    # 目的関数：総石数最小化
    model.objective = xsum(z.values())

    # 解く
    status = model.optimize(max_seconds=10)

    # 結果を assignment 行列に変換
    assignment = np.zeros((n, n), dtype=int)
    for i in range(n):
        for j in range(n):
            for k in range(m):
                if x[i][j][k].x >= 0.5:
                    assignment[i, j] = k
    return assignment
