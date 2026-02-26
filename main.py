import logging

from formulation import heuristic
from utils import generate_data, visualize_solution

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

# パラメータ
F_NUM = 12  # グリッドサイズ
P_NUM = 12  # プレイヤー数
SCORE_RANGE = (10, 20)  # 各マスのスコア乱数範囲
REQ_RANGE = (150, 200)  # 最低要求スコア乱数範囲
SEED = 4  # 再現用シード
MAX_SECONDS = 60  # ソルバーの打ち切りタイムリミット


def main():
    # データ生成
    grid, reqs = generate_data(F_NUM, P_NUM, cell_value_range=SCORE_RANGE, req_range=REQ_RANGE, seed=SEED)
    print("Generated grid:")
    print(grid)
    print("Player requirements:", reqs)

    # 異なる定式化で結果を比較
    assignment = heuristic.solve_assignment(grid, reqs, max_seconds=MAX_SECONDS)
    visualize_solution(
        grid,
        assignment,
        reqs,
        seconds=MAX_SECONDS,
        title="minimize edge_diff result",
        filename="output/minimize_edge_diff_heuristic.svg",
    )

    return 0


if __name__ == "__main__":
    main()
