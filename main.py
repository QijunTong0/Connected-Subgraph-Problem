import formulation.edge_diff
import formulation.xy_boundbox
from visualization import generate_data, visualize_solution
import formulation
import random
import numpy as np
def main():
    # パラメータ
    F_NUM = 10 # グリッドサイズ
    P_NUM = 4 # プレイヤー数
    SEED = 42 # 再現用シード

    # データ生成
    grid, reqs = generate_data(F_NUM, P_NUM, cell_value_range=(1,1),req_range=(15,15),seed=SEED)
    print("Generated grid:") 
    print(grid)
    print("Player requirements:", reqs)

    # （ここで MIP を解いて assignment を取得する想定）
    assignment  = formulation.edge_diff.solve_assignment(grid, reqs, stone_budget=None)
    visualize_solution(grid, assignment,filename=f"output/minimize_edge_diff.svg")

    assignment  = formulation.xy_boundbox.solve_assignment(grid, reqs, stone_budget=None)
    visualize_solution(grid, assignment,filename=f"output/minimize_xy_boundbox.svg")

if __name__ == "__main__":
    main()
