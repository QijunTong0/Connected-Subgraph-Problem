from visualization import generate_data, visualize_solution
import random
import numpy as np
def main():
    # パラメータ
    F_NUM = 15 # グリッドサイズ
    P_NUM = 8 # プレイヤー数
    SEED = 42 # 再現用シード

    # データ生成
    grid, reqs = generate_data(F_NUM, P_NUM, cell_value_range=(1,9), seed=SEED)
    print("Generated grid:") 
    print(grid)
    print("Player requirements:", reqs)

    # （ここで MIP を解いて assignment を取得する想定）
    # デモ用にランダム配置
    assignment = np.random.randint(0,P_NUM,size=(F_NUM,F_NUM))
    # 可視化
    visualize_solution(grid, assignment)

if __name__ == "__main__":
    main()
