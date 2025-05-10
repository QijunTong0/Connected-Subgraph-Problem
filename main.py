import formulation.edge_diff
import formulation.xy_boundbox
from visualization import generate_data, visualize_solution

F_NUM = 20  # グリッドサイズ
P_NUM = 15  # プレイヤー数
SCORE_RANGE = (1, 30)  # 各マスのスコア乱数範囲
REQ_RANGE = (300, 900)  # 最低要求スコア乱数範囲
SEED = 42  # 再現用シード
MAX_SECONDS = 30  # ソルバーの打ち切りタイムリミット


def main():
    # パラメータ

    # データ生成
    grid, reqs = generate_data(F_NUM, P_NUM, cell_value_range=SCORE_RANGE, req_range=REQ_RANGE, seed=SEED)
    print("Generated grid:")
    print(grid)
    print("Player requirements:", reqs)

    # 異なる定式化で結果を比較
    assignment = formulation.edge_diff.solve_assignment(grid, reqs, max_seconds=MAX_SECONDS)
    visualize_solution(grid, assignment, seconds=MAX_SECONDS, filename="output/minimize_edge_diff.svg")

    assignment = formulation.xy_boundbox.solve_assignment(grid, reqs, max_seconds=MAX_SECONDS)
    visualize_solution(grid, assignment, seconds=MAX_SECONDS, filename="output/minimize_xy_boundbox.svg")


if __name__ == "__main__":
    main()
