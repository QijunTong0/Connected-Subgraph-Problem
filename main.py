from visualization import generate_data, visualize_solution
from mip_model.xy_minmax import solve_assignment
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
    # デモ用にランダム配置
    assignment  = solve_assignment(grid, reqs, stone_budget=None)
    # 可視化
    visualize_solution(grid, assignment)

if __name__ == "__main__":
    main()
