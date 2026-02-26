// main.ts — UI logic and Canvas visualization

import type { SolveParams, WorkerMessage } from "./solver.worker";

// ---------------------------------------------------------------------------
// Player colors — matches matplotlib tab20 palette approximately
// Index 0 = empty (white), 1..20 = players
// ---------------------------------------------------------------------------
const PLAYER_COLORS: string[] = [
  "#ffffff", // 0: empty
  "#4e79a7", "#f28e2b", "#e15759", "#76b7b2",
  "#59a14f", "#edc948", "#b07aa1", "#ff9da7",
  "#9c755f", "#bab0ac", "#1f77b4", "#ff7f0e",
  "#2ca02c", "#d62728", "#9467bd", "#8c564b",
  "#e377c2", "#7f7f7f", "#bcbd22", "#17becf",
];

// ---------------------------------------------------------------------------
// Canvas drawing
// ---------------------------------------------------------------------------
function drawGrid(
  canvas: HTMLCanvasElement,
  grid: number[][],
  asgn: number[][],
): void {
  const ctx = canvas.getContext("2d")!;
  const n = grid.length;
  const cell = Math.floor(canvas.width / n);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const pid = asgn[i][j];
      ctx.fillStyle = PLAYER_COLORS[pid] ?? "#ccc";
      ctx.fillRect(j * cell, i * cell, cell, cell);

      ctx.strokeStyle = "#555";
      ctx.lineWidth = 0.5;
      ctx.strokeRect(j * cell, i * cell, cell, cell);

      ctx.fillStyle = "rgba(0,0,0,0.28)";
      const fs = Math.max(8, Math.floor(cell * 0.38));
      ctx.font = `${fs}px monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(grid[i][j]), j * cell + cell / 2, i * cell + cell / 2);
    }
  }
}

// ---------------------------------------------------------------------------
// Stats table
// ---------------------------------------------------------------------------
function renderTable(
  tbody: HTMLTableSectionElement,
  scores: number[],
  requirements: number[],
): void {
  tbody.innerHTML = scores
    .map((score, k) => {
      const req = requirements[k];
      const delta = score - req;
      const sign = delta >= 0 ? "+" : "";
      const ok = score >= req;
      return `<tr>
        <td><span class="color-dot" style="background:${PLAYER_COLORS[k + 1] ?? "#ccc"}"></span>Player ${k + 1}</td>
        <td>${score.toLocaleString()}</td>
        <td>${req.toLocaleString()}</td>
        <td>${sign}${delta.toLocaleString()}</td>
        <td class="${ok ? "satisfied" : "not-satisfied"}">${ok ? "✓ OK" : "✗ UNMET"}</td>
      </tr>`;
    })
    .join("");
}

// ---------------------------------------------------------------------------
// Chip helpers
// ---------------------------------------------------------------------------
function setChips(
  el: HTMLElement,
  items: [string, string | number][],
): void {
  el.innerHTML = items
    .map(([label, val]) => `<span class="chip"><b>${label}</b> ${val}</span>`)
    .join("");
}

// ---------------------------------------------------------------------------
// App entry point
// ---------------------------------------------------------------------------
const canvas = document.getElementById("grid-canvas") as HTMLCanvasElement;
const runBtn = document.getElementById("run-btn") as HTMLButtonElement;
const progressBar = document.getElementById("progress-bar") as HTMLDivElement;
const progressLabel = document.getElementById("progress-label") as HTMLSpanElement;
const statsArea = document.getElementById("stats-area") as HTMLDivElement;
const metaChips = document.getElementById("meta-chips") as HTMLDivElement;
const tbody = document.querySelector("#stats-table tbody") as HTMLTableSectionElement;
const errorBox = document.getElementById("error-box") as HTMLDivElement;
const placeholder = document.getElementById("placeholder") as HTMLDivElement;

let worker: Worker | null = null;
let currentGrid: number[][] | null = null;
let currentReqs: number[] | null = null;
let initEdgeDiff = 0;
let t0 = 0;

function getParams(): SolveParams {
  const v = (id: string) => parseInt((document.getElementById(id) as HTMLInputElement).value, 10);
  return {
    n: v("inp-n"),
    m: v("inp-m"),
    cellValueMin: v("inp-cv-min"),
    cellValueMax: v("inp-cv-max"),
    reqMin: v("inp-req-min"),
    reqMax: v("inp-req-max"),
    seed: v("inp-seed"),
    maxIter: v("inp-max-iter"),
  };
}

function validate(p: SolveParams): string | null {
  if (p.n < 5 || p.n > 20) return "Grid size n must be 5–20.";
  if (p.m < 2 || p.m > 15) return "Player count m must be 2–15.";
  if (p.cellValueMin < 1) return "Cell score min must be ≥ 1.";
  if (p.cellValueMin > p.cellValueMax) return "Cell score min must be ≤ max.";
  if (p.reqMin < 0) return "Requirement min must be ≥ 0.";
  if (p.reqMin > p.reqMax) return "Requirement min must be ≤ max.";
  if (p.maxIter < 1000 || p.maxIter > 500000) return "Max iterations must be 1,000–500,000.";
  return null;
}

function setProgress(pct: number, label: string): void {
  progressBar.style.width = `${pct}%`;
  progressLabel.textContent = label;
}

function showError(msg: string): void {
  errorBox.textContent = msg;
  errorBox.style.display = "block";
}

function hideError(): void {
  errorBox.style.display = "none";
}

function resizeCanvas(n: number): void {
  const size = Math.min(480, window.innerWidth - 32);
  canvas.width = size;
  canvas.height = size;
}

runBtn.addEventListener("click", () => {
  hideError();
  const params = getParams();
  const err = validate(params);
  if (err) { showError(err); return; }

  // Terminate any running worker
  if (worker) { worker.terminate(); worker = null; }

  resizeCanvas(params.n);
  placeholder.style.display = "none";
  canvas.style.display = "block";
  statsArea.style.display = "none";
  setProgress(0, "Starting...");
  runBtn.disabled = true;
  t0 = performance.now();

  worker = new Worker(new URL("./solver.worker.ts", import.meta.url), { type: "module" });
  worker.postMessage(params);

  worker.onmessage = (e: MessageEvent<WorkerMessage>) => {
    const msg = e.data;

    if (msg.type === "start") {
      currentGrid = msg.grid;
      currentReqs = msg.requirements;
      initEdgeDiff = msg.initEdgeDiff;
      drawGrid(canvas, msg.grid, msg.grid.map((row) => row.map(() => 0)));
      setProgress(0, `Initial edge_diff: ${initEdgeDiff}`);
    }

    if (msg.type === "progress") {
      const pct = Math.round((msg.iter / msg.maxIter) * 100);
      const elapsed = ((performance.now() - t0) / 1000).toFixed(1);
      setProgress(pct, `${pct}% | edge_diff: ${msg.edgeDiff} | ${elapsed}s`);
      if (currentGrid) drawGrid(canvas, currentGrid, msg.assignment);
    }

    if (msg.type === "done") {
      const elapsed = ((performance.now() - t0) / 1000).toFixed(2);
      setProgress(100, `Done — ${elapsed}s | edge_diff: ${initEdgeDiff} → ${msg.finalEdgeDiff} (−${initEdgeDiff - msg.finalEdgeDiff})`);

      if (currentGrid) drawGrid(canvas, currentGrid, msg.assignment);

      setChips(metaChips, [
        ["Grid:", `${params.n} × ${params.n}`],
        ["Players:", params.m],
        ["Elapsed:", `${elapsed}s`],
        ["edge_diff:", `${initEdgeDiff} → ${msg.finalEdgeDiff}`],
        ["Improved:", `−${initEdgeDiff - msg.finalEdgeDiff}`],
      ]);

      renderTable(tbody, msg.scores, msg.requirements);
      statsArea.style.display = "block";
      runBtn.disabled = false;
      worker = null;
    }
  };

  worker.onerror = (err) => {
    showError(`Solver error: ${err.message}`);
    runBtn.disabled = false;
    worker = null;
  };
});
