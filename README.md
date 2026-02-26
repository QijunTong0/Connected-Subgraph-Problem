# 連結性制約を考慮した整数計画問題

## 問題設定
- $n \times n$ の碁盤状グリッド。各セル $(i,j)$ にスコア $g_{ij}$ が割り当てられている。
- $m$ 人のプレイヤーがそれぞれグリッド上に石を配置する。
  1. 各セルには高々1つの石を置く。
  2. プレイヤー $k$ の得点は、彼が石を置いたセルの値の総和。
  3. 各プレイヤー $k$ には最低得点要求 $R_k$ が存在する。
  4. グリッドは $A$ 領域に分割され、各領域には少なくとも1つ石を配置。
  5. 各プレイヤーの石が置かれた領域は連結していなければいけない。

---

## 変数
### 決定変数

$$
x_{ijk} =
\begin{cases}
1, & \text{プレイヤー } k \text{ がセル } (i,j) \text{ に石を置く},\\
0, & \text{それ以外}.
\end{cases}
$

---

## 制約条件

1. **各セルに高々1つの石**

$$
\sum_{k=1}^m x_{ijk} \le 1 \quad \forall i,j.
$$

2. **各プレイヤーの最低得点要求**

$$
\sum_{i=1}^n \sum_{j=1}^n g_{ij} x_{ijk} \ge R_k \quad \forall k.
$$

3. **各領域 $a$ に少なくとも1石**

$$
\sum_{(i,j)\in \mathcal{A}_a}\sum_{k=1}^m x_{ijk} \ge 1 \quad \forall a.
$$

4. **各プレイヤーの石が置かれた領域は連結していなければいけない。**
   厳密に制約を守るにはフロー制約を使うが計算量が膨大になる
   厳密性を捨て、様々なヒューリスティックな定式化を検討する。

---

## 目的関数
   様々な定式化を検討する。

# 環境構築・実行方法

## Webアプリ（メイン実装）

Node.js（v18以上）が必要。

```bash
cd web
npm install
npm run dev
```

ブラウザで `http://localhost:5173` を開くとインタラクティブなソルバーが起動する。

## ビルド（本番用）

```bash
cd web
npm run build
```

`web/dist/` に静的ファイルが生成される。

---

## 参考：Python スクリプト（旧実装）

`formulation/` フォルダにヒューリスティックソルバーの Python 実装がある。
こちらは Web 版の参考実装であり、現在はメンテナンスされていない。

実行する場合は [uv](https://github.com/astral-sh/uv) と [HiGHS](https://github.com/JuliaBinaryWrappers/HiGHSstatic_jll.jl/releases) が必要。

```bash
uv run main.py
```
