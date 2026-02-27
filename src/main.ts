// main.ts — UI logic, Canvas grid visualization, and loss chart

import type { SolveParams, WorkerMessage } from "./solver.worker";
import { t, setLang, applyLang, type Lang } from "./i18n";

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
// Grid Canvas drawing
// ---------------------------------------------------------------------------
function drawGrid(canvas: HTMLCanvasElement, grid: number[][], asgn: number[][]): void {
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
// Loss function chart (X: log scale iterations, Y: edge_diff)
// ---------------------------------------------------------------------------
interface LossPoint { iter: number; edgeDiff: number; }

const lossHistory: LossPoint[] = [];

function drawChart(maxIter: number): void {
  const ctx = chartCanvas.getContext("2d")!;
  // Fit canvas width to its container each time (handles first-render sizing)
  chartCanvas.width = chartCanvas.parentElement!.clientWidth - 36;

  const W = chartCanvas.width;
  const H = chartCanvas.height;
  const PAD = { top: 15, right: 20, bottom: 38, left: 58 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, W, H);

  if (lossHistory.length < 2) return;

  const yVals = lossHistory.map((p) => p.edgeDiff);
  const yMin = Math.min(...yVals);
  const yMax = Math.max(...yVals);
  const yRange = yMax - yMin || 1;

  // Log X scale: log10(1) → log10(maxIter)
  const xLogMax = Math.log10(maxIter);
  const xScale = (iter: number): number => {
    const logIter = Math.log10(Math.max(1, iter));
    return PAD.left + (logIter / xLogMax) * plotW;
  };
  const yScale = (v: number): number =>
    PAD.top + (1 - (v - yMin) / yRange) * plotH;

  // Grid lines + X-axis labels (powers of 10 that fit the range)
  const decades = [1, 10, 100, 1_000, 10_000, 100_000, 500_000].filter(
    (d) => d <= maxIter,
  );
  ctx.font = "11px system-ui";

  for (const d of decades) {
    const x = xScale(d);

    ctx.strokeStyle = "#eee";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, PAD.top);
    ctx.lineTo(x, PAD.top + plotH);
    ctx.stroke();

    ctx.fillStyle = "#888";
    ctx.textAlign = "center";
    ctx.fillText(
      d >= 1_000 ? `${d / 1_000}k` : String(d),
      x,
      PAD.top + plotH + 16,
    );
  }

  // Y-axis labels and horizontal grid lines (5 levels)
  ctx.textAlign = "right";
  for (let step = 0; step <= 4; step++) {
    const v = yMin + (yRange * step) / 4;
    const y = yScale(v);

    ctx.strokeStyle = "#eee";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PAD.left, y);
    ctx.lineTo(PAD.left + plotW, y);
    ctx.stroke();

    ctx.fillStyle = "#888";
    ctx.fillText(Math.round(v).toString(), PAD.left - 6, y + 4);
  }

  // Axis border
  ctx.strokeStyle = "#ccc";
  ctx.lineWidth = 1;
  ctx.strokeRect(PAD.left, PAD.top, plotW, plotH);

  // Loss line
  ctx.strokeStyle = "#5c7cfa";
  ctx.lineWidth = 2;
  ctx.lineJoin = "round";
  ctx.beginPath();
  lossHistory.forEach((p, i) => {
    const x = xScale(Math.max(1, p.iter));
    const y = yScale(p.edgeDiff);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // Data point dots
  ctx.fillStyle = "#5c7cfa";
  for (const p of lossHistory) {
    const x = xScale(Math.max(1, p.iter));
    const y = yScale(p.edgeDiff);
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Axis labels
  ctx.fillStyle = "#666";
  ctx.textAlign = "center";
  ctx.font = "11px system-ui";
  ctx.fillText(t("chart.xaxis"), PAD.left + plotW / 2, H - 4);

  ctx.save();
  ctx.translate(12, PAD.top + plotH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(t("chart.yaxis"), 0, 0);
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Stats table
// ---------------------------------------------------------------------------
function renderTable(tbody: HTMLTableSectionElement, scores: number[], requirements: number[]): void {
  tbody.innerHTML = scores
    .map((score, k) => {
      const req = requirements[k];
      const delta = score - req;
      const sign = delta >= 0 ? "+" : "";
      const ok = score >= req;
      return `<tr>
        <td><span class="color-dot" style="background:${PLAYER_COLORS[k + 1] ?? "#ccc"}"></span>${t("table.player", { k: k + 1 })}</td>
        <td>${score.toLocaleString()}</td>
        <td>${req.toLocaleString()}</td>
        <td>${sign}${delta.toLocaleString()}</td>
        <td class="${ok ? "satisfied" : "not-satisfied"}">${ok ? t("table.ok") : t("table.unmet")}</td>
      </tr>`;
    })
    .join("");
}

// ---------------------------------------------------------------------------
// Chip helper
// ---------------------------------------------------------------------------
function setChips(el: HTMLElement, items: [string, string | number][]): void {
  el.innerHTML = items
    .map(([label, val]) => `<span class="chip"><b>${label}</b> ${val}</span>`)
    .join("");
}

// ---------------------------------------------------------------------------
// DOM refs
// ---------------------------------------------------------------------------
const canvas      = document.getElementById("grid-canvas")  as HTMLCanvasElement;
const chartCanvas = document.getElementById("chart-canvas") as HTMLCanvasElement;
const chartArea   = document.getElementById("chart-area")   as HTMLDivElement;
const runBtn      = document.getElementById("run-btn")       as HTMLButtonElement;
const progressBar = document.getElementById("progress-bar") as HTMLDivElement;
const progressLabel = document.getElementById("progress-label") as HTMLSpanElement;
const statsArea   = document.getElementById("stats-area")   as HTMLDivElement;
const metaChips   = document.getElementById("meta-chips")   as HTMLDivElement;
const tbody       = document.querySelector("#stats-table tbody") as HTMLTableSectionElement;
const errorBox    = document.getElementById("error-box")    as HTMLDivElement;
const placeholder = document.getElementById("placeholder")  as HTMLDivElement;

let worker: Worker | null = null;
let currentGrid: number[][] | null = null;
let initEdgeDiff = 0;
let t0 = 0;
let lastMaxIter = 100000;
let lastScores: number[] = [];
let lastRequirements: number[] = [];

// ---------------------------------------------------------------------------
// Form helpers
// ---------------------------------------------------------------------------
function getParams(): SolveParams {
  const v = (id: string) => parseInt((document.getElementById(id) as HTMLInputElement).value, 10);
  const vf = (id: string) => parseFloat((document.getElementById(id) as HTMLInputElement).value);
  return {
    n: v("inp-n"),
    m: v("inp-m"),
    cellValueMin: v("inp-cv-min"),
    cellValueMax: v("inp-cv-max"),
    reqMin: v("inp-req-min"),
    reqMax: v("inp-req-max"),
    seed: v("inp-seed"),
    maxIter: v("inp-max-iter"),
    lambdaReq: vf("inp-lambda-req"),
  };
}

function validate(p: SolveParams): string | null {
  if (p.n < 5 || p.n > 20) return t("err.n");
  if (p.m < 2 || p.m > 15) return t("err.m");
  if (p.cellValueMin < 1) return t("err.cvmin");
  if (p.cellValueMin > p.cellValueMax) return t("err.cvminmax");
  if (p.reqMin < 0) return t("err.reqmin");
  if (p.reqMin > p.reqMax) return t("err.reqminmax");
  if (p.maxIter < 1000 || p.maxIter > 500000) return t("err.maxiter");
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

// ---------------------------------------------------------------------------
// Language toggle
// ---------------------------------------------------------------------------
document.querySelectorAll<HTMLButtonElement>("[data-lang-btn]").forEach((btn) => {
  btn.addEventListener("click", () => {
    setLang(btn.dataset.langBtn as Lang);
    // Redraw canvas-based elements that contain translated text
    if (lossHistory.length >= 2) drawChart(lastMaxIter);
    if (lastScores.length > 0) renderTable(tbody, lastScores, lastRequirements);
  });
});

// Apply default language (JA) on load
applyLang();

// ---------------------------------------------------------------------------
// Main click handler
// ---------------------------------------------------------------------------
runBtn.addEventListener("click", () => {
  hideError();
  const params = getParams();
  const err = validate(params);
  if (err) { showError(err); return; }

  if (worker) { worker.terminate(); worker = null; }

  // Resize grid canvas
  const size = Math.min(480, window.innerWidth - 32);
  canvas.width = size;
  canvas.height = size;

  placeholder.style.display = "none";
  canvas.style.display = "block";
  statsArea.style.display = "none";
  chartArea.style.display = "none";
  setProgress(0, t("progress.starting"));
  runBtn.disabled = true;
  t0 = performance.now();
  lastMaxIter = params.maxIter;

  worker = new Worker(new URL("./solver.worker.ts", import.meta.url), { type: "module" });
  worker.postMessage(params);

  worker.onmessage = (e: MessageEvent<WorkerMessage>) => {
    const msg = e.data;

    if (msg.type === "start") {
      currentGrid = msg.grid;
      initEdgeDiff = msg.initEdgeDiff;

      // Draw blank grid to show problem layout
      drawGrid(canvas, msg.grid, msg.grid.map((row) => row.map(() => 0)));

      // Init chart
      lossHistory.length = 0;
      lossHistory.push({ iter: 0, edgeDiff: msg.initEdgeDiff });
      chartArea.style.display = "block";
      drawChart(params.maxIter);

      setProgress(0, t("progress.initial", { val: initEdgeDiff }));
    }

    if (msg.type === "progress") {
      const pct = Math.round((msg.iter / msg.maxIter) * 100);
      const elapsed = ((performance.now() - t0) / 1000).toFixed(1);
      setProgress(pct, t("progress.running", { pct, edgeDiff: msg.edgeDiff, elapsed }));

      if (currentGrid) drawGrid(canvas, currentGrid, msg.assignment);

      lossHistory.push({ iter: msg.iter, edgeDiff: msg.edgeDiff });
      drawChart(params.maxIter);
    }

    if (msg.type === "done") {
      const elapsed = ((performance.now() - t0) / 1000).toFixed(2);
      setProgress(
        100,
        t("progress.done", {
          elapsed,
          init: initEdgeDiff,
          final: msg.finalEdgeDiff,
          diff: initEdgeDiff - msg.finalEdgeDiff,
        }),
      );

      if (currentGrid) drawGrid(canvas, currentGrid, msg.assignment);

      lossHistory.push({ iter: params.maxIter, edgeDiff: msg.finalEdgeDiff });
      drawChart(params.maxIter);

      setChips(metaChips, [
        [t("chip.grid"), `${params.n} × ${params.n}`],
        [t("chip.players"), params.m],
        [t("chip.elapsed"), `${elapsed}s`],
        [t("chip.edgediff"), `${initEdgeDiff} → ${msg.finalEdgeDiff}`],
        [t("chip.improved"), `−${initEdgeDiff - msg.finalEdgeDiff}`],
      ]);

      lastScores = msg.scores;
      lastRequirements = msg.requirements;
      renderTable(tbody, msg.scores, msg.requirements);
      statsArea.style.display = "block";
      runBtn.disabled = false;
      worker = null;
    }
  };

  worker.onerror = (err) => {
    showError(t("err.solver", { msg: err.message }));
    runBtn.disabled = false;
    worker = null;
  };
});
