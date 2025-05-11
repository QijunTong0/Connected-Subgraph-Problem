from formulation import edge_diff, xy_boundbox
from utils import generate_data, visualize_solution

# パラメータ
F_NUM = 12  # グリッドサイズ
P_NUM = 10  # プレイヤー数
SCORE_RANGE = (1, 30)  # 各マスのスコア乱数範囲
REQ_RANGE = (150, 200)  # 最低要求スコア乱数範囲
SEED = 42  # 再現用シード
MAX_SECONDS = 60  # ソルバーの打ち切りタイムリミット


def main():
    # データ生成
    grid, reqs = generate_data(F_NUM, P_NUM, cell_value_range=SCORE_RANGE, req_range=REQ_RANGE, seed=SEED)
    print("Generated grid:")
    print(grid)
    print("Player requirements:", reqs)

    # 異なる定式化で結果を比較
    # 割り当てエリアの座標の幅を最小化
    assignment = edge_diff.solve_assignment(grid, reqs, max_seconds=MAX_SECONDS)
    visualize_solution(
        grid,
        assignment,
        seconds=MAX_SECONDS,
        title="edge_diff_formulation result",
        filename="output/minimize_edge_diff.svg",
    )

    # 隣接エリアが異なる割り当てになる回数の最小化
    assignment = xy_boundbox.solve_assignment(grid, reqs, max_seconds=MAX_SECONDS)
    visualize_solution(
        grid,
        assignment,
        seconds=MAX_SECONDS,
        title="xy_boundbox_formulation result",
        filename="output/minimize_xy_boundbox.svg",
    )


if __name__ == "__main__":
    main()
