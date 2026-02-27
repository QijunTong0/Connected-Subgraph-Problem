// i18n.ts — JA / EN translations

import renderMathInElement from "katex/contrib/auto-render";
import "katex/dist/katex.min.css";

export type Lang = "ja" | "en";

const translations: Record<Lang, Record<string, string>> = {
  ja: {
    // ---- Header ----
    "header.title":    "連結部分グラフ問題 — ヒューリスティックソルバー",
    "header.subtitle": "貪欲法による初期割り当て + 局所探索（境界エッジを最小化）· すべてブラウザ内で実行",

    // ---- Description panel ----
    "desc.title": "このアプリについて",
    "desc.lead.html":
      "<strong>連結部分グラフ問題</strong><br>" +
      "m人のプレイヤーがn×nのグリッドに石を置き、スコアを最大化しながら" +
      "各プレイヤーの領域を連結にまとめることを目指す問題です。",

    "desc.subtitle.problem":     "問題設定",
    "desc.list.problem.1":       "グリッド: n×nのマス目；各マス(i,j)はスコア\\(g_{ij}\\)を持つ",
    "desc.list.problem.2":       "mプレイヤーがそれぞれマスのサブセットを占有する",
    "desc.list.problem.3":       "各マスは<em>最大1個</em>の石しか置けない",
    "desc.list.problem.4":       "プレイヤーkのスコア = 占有マスの\\(\\sum g_{ij}\\)",

    "desc.subtitle.constraints": "制約",
    "desc.list.constraints.1":   "\\(R_k \\leq \\mathrm{score}_k \\leq 1.2 \\cdot R_k \\quad \\forall k\\)",
    "desc.list.constraints.2":   "各プレイヤーの石は<em>連結</em>な領域を形成すること",

    "desc.subtitle.objective":   "目的関数",
    "desc.formula.html":
      "\\(\\text{edge\\_diff} + \\lambda \\sum_k \\max(0,\\, R_k - \\mathrm{score}_k)\\) を最小化<br>" +
      "第1項: 異なるプレイヤーが隣接するマスのペア数（連結性の近似）<br>" +
      "第2項: 要求スコア未達のペナルティ（λ で重み調整）",
    "desc.note": "λ=0 なら連結性のみ最適化；λ>0 なら要求制約を同時に考慮",

    "desc.subtitle.algorithm":   "アルゴリズム",
    "desc.list.algo.1":
      "<strong>フェーズ1 — 貪欲初期割り当て:</strong> " +
      "スコアが高いマスから順に、残りスコア枠が最も狭いプレイヤーへ割り当てる。",
    "desc.list.algo.2":
      "<strong>フェーズ2 — 局所探索:</strong> " +
      "ランダムに2マスを入れ替えるか1マスを再割り当て；複合損失（edge_diff + λ×要求ペナルティ）が減少する場合のみ採用。",

    // ---- Params panel ----
    "params.title":          "パラメータ",
    "params.section.grid":   "グリッド",
    "params.label.n":        "グリッドサイズ n (n × n)",
    "params.hint.n":         "5 – 20",
    "params.label.m":        "プレイヤー数 m",
    "params.hint.m":         "2 – 15",
    "params.section.cell":   "セルスコア範囲",
    "params.label.min":      "最小",
    "params.label.max":      "最大",
    "params.section.req":    "要求スコア範囲",
    "params.section.solver": "ソルバー",
    "params.label.seed":        "乱数シード",
    "params.label.maxiter":     "最大イテレーション数",
    "params.hint.maxiter":      "1,000 – 500,000",
    "params.label.lambdareq":   "要求ペナルティ λ",
    "params.hint.lambdareq":    "0 = 無視 ／ 大きいほど要求制約を優先",
    "params.run":               "ソルバーを実行",

    // ---- Result area ----
    "result.placeholder": "パラメータを設定して「ソルバーを実行」をクリックしてください。",
    "chart.title":        "損失関数（edge_diff）のイテレーション推移",
    "chart.xaxis":        "イテレーション数",
    "chart.yaxis":        "edge_diff",

    // ---- Stats table ----
    "stats.title":      "プレイヤースコアと要求値",
    "stats.col.player": "プレイヤー",
    "stats.col.score":  "スコア",
    "stats.col.req":    "要求値",
    "stats.col.diff":   "差分",
    "stats.col.status": "ステータス",

    // ---- Progress messages ({placeholder} syntax) ----
    "progress.starting": "開始中...",
    "progress.initial":  "初期 edge_diff: {val}",
    "progress.running":  "{pct}% | edge_diff: {edgeDiff} | {elapsed}秒",
    "progress.done":     "完了 — {elapsed}秒 | edge_diff: {init} → {final} (−{diff})",

    // ---- Meta chips ----
    "chip.grid":     "グリッド:",
    "chip.players":  "プレイヤー:",
    "chip.elapsed":  "経過時間:",
    "chip.edgediff": "edge_diff:",
    "chip.improved": "改善量:",

    // ---- Table rows ----
    "table.player": "プレイヤー {k}",
    "table.ok":     "✓ 達成",
    "table.unmet":  "✗ 未達成",

    // ---- Validation errors ----
    "err.n":        "グリッドサイズ n は 5–20 の範囲で指定してください。",
    "err.m":        "プレイヤー数 m は 2–15 の範囲で指定してください。",
    "err.cvmin":    "セルスコアの最小値は 1 以上にしてください。",
    "err.cvminmax": "セルスコアの最小値は最大値以下にしてください。",
    "err.reqmin":   "要求スコアの最小値は 0 以上にしてください。",
    "err.reqminmax":"要求スコアの最小値は最大値以下にしてください。",
    "err.maxiter":  "最大イテレーション数は 1,000–500,000 の範囲で指定してください。",
    "err.solver":   "ソルバーエラー: {msg}",
  },

  en: {
    // ---- Header ----
    "header.title":    "Connected Subgraph Problem — Heuristic Solver",
    "header.subtitle": "Greedy initial assignment + local search (minimize inter-player boundary edges) · runs entirely in your browser",

    // ---- Description panel ----
    "desc.title": "What is this?",
    "desc.lead.html":
      "<strong>Connected Subgraph Problem</strong><br>" +
      "m players place stones on an n×n grid to maximise their scores " +
      "while keeping their occupied regions compact.",

    "desc.subtitle.problem":     "Problem setting",
    "desc.list.problem.1":       "Grid: n×n cells; each cell (i,j) has score \\(g_{ij}\\)",
    "desc.list.problem.2":       "m players each claim a subset of cells",
    "desc.list.problem.3":       "Each cell holds <em>at most 1 stone</em>",
    "desc.list.problem.4":       "Player k's score = \\(\\sum g_{ij}\\) over claimed cells",

    "desc.subtitle.constraints": "Constraints",
    "desc.list.constraints.1":   "\\(R_k \\leq \\mathrm{score}_k \\leq 1.2 \\cdot R_k \\quad \\forall k\\)",
    "desc.list.constraints.2":   "Each player's stones should form a <em>connected</em> region",

    "desc.subtitle.objective":   "Objective",
    "desc.formula.html":
      "Minimize \\(\\text{edge\\_diff} + \\lambda \\sum_k \\max(0,\\, R_k - \\mathrm{score}_k)\\)<br>" +
      "Term 1: # adjacent pairs owned by <em>different</em> players (connectivity proxy)<br>" +
      "Term 2: penalty for unmet score requirements (weighted by λ)",
    "desc.note": "λ=0: optimise connectivity only; λ>0: also enforce score requirements.",

    "desc.subtitle.algorithm":   "Algorithm",
    "desc.list.algo.1":
      "<strong>Phase 1 — Greedy init:</strong> Assign cells (highest value first) to the player with the tightest remaining score window.",
    "desc.list.algo.2":
      "<strong>Phase 2 — Local search:</strong> Randomly swap two cells or reassign one cell; accept only if composite loss (edge_diff + λ×req. penalty) decreases.",

    // ---- Params panel ----
    "params.title":          "Parameters",
    "params.section.grid":   "Grid",
    "params.label.n":        "Grid size n (n × n)",
    "params.hint.n":         "5 – 20",
    "params.label.m":        "Players m",
    "params.hint.m":         "2 – 15",
    "params.section.cell":   "Cell score range",
    "params.label.min":      "Min",
    "params.label.max":      "Max",
    "params.section.req":    "Requirement range",
    "params.section.solver": "Solver",
    "params.label.seed":        "Random seed",
    "params.label.maxiter":     "Max iterations",
    "params.hint.maxiter":      "1,000 – 500,000",
    "params.label.lambdareq":   "Requirement penalty λ",
    "params.hint.lambdareq":    "0 = ignore ／ larger = stricter requirement enforcement",
    "params.run":               "Run Solver",

    // ---- Result area ----
    "result.placeholder": "Set parameters and click Run Solver.",
    "chart.title":        "Loss Function (edge_diff) over Iterations",
    "chart.xaxis":        "Iterations",
    "chart.yaxis":        "edge_diff",

    // ---- Stats table ----
    "stats.title":      "Player Scores vs Requirements",
    "stats.col.player": "Player",
    "stats.col.score":  "Score",
    "stats.col.req":    "Requirement",
    "stats.col.diff":   "Surplus / Deficit",
    "stats.col.status": "Status",

    // ---- Progress messages ----
    "progress.starting": "Starting...",
    "progress.initial":  "Initial edge_diff: {val}",
    "progress.running":  "{pct}% | edge_diff: {edgeDiff} | {elapsed}s",
    "progress.done":     "Done — {elapsed}s | edge_diff: {init} → {final} (−{diff})",

    // ---- Meta chips ----
    "chip.grid":     "Grid:",
    "chip.players":  "Players:",
    "chip.elapsed":  "Elapsed:",
    "chip.edgediff": "edge_diff:",
    "chip.improved": "Improved:",

    // ---- Table rows ----
    "table.player": "Player {k}",
    "table.ok":     "✓ OK",
    "table.unmet":  "✗ UNMET",

    // ---- Validation errors ----
    "err.n":        "Grid size n must be 5–20.",
    "err.m":        "Player count m must be 2–15.",
    "err.cvmin":    "Cell score min must be ≥ 1.",
    "err.cvminmax": "Cell score min must be ≤ max.",
    "err.reqmin":   "Requirement min must be ≥ 0.",
    "err.reqminmax":"Requirement min must be ≤ max.",
    "err.maxiter":  "Max iterations must be 1,000–500,000.",
    "err.solver":   "Solver error: {msg}",
  },
};

let currentLang: Lang = "ja";

export function getLang(): Lang { return currentLang; }

export function setLang(lang: Lang): void {
  currentLang = lang;
  applyLang();
}

export function t(key: string, params?: Record<string, string | number>): string {
  let str = translations[currentLang][key] ?? translations.en[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      str = str.replaceAll(`{${k}}`, String(v));
    }
  }
  return str;
}

export function applyLang(): void {
  document.documentElement.lang = currentLang;

  document.querySelectorAll<HTMLElement>("[data-i18n]").forEach((el) => {
    el.textContent = t(el.dataset.i18n!);
  });

  document.querySelectorAll<HTMLElement>("[data-i18n-html]").forEach((el) => {
    el.innerHTML = t(el.dataset.i18nHtml!);
  });

  document.querySelectorAll<HTMLButtonElement>("[data-lang-btn]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.langBtn === currentLang);
  });

  // Re-render LaTeX in the description panel after DOM update
  const descPanel = document.querySelector<HTMLElement>(".panel-desc");
  if (descPanel) {
    renderMathInElement(descPanel, {
      delimiters: [
        { left: "\\(", right: "\\)", display: false },
        { left: "\\[", right: "\\]", display: true },
      ],
      throwOnError: false,
    });
  }
}
