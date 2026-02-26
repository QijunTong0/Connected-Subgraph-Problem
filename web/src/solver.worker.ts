// solver.worker.ts — Web Worker: Simulated Annealing + boundary-cell sampling

import {
  calcLocalScore,
  generateData,
  initialAssignment,
  makePrng,
  playerScores,
  randInt,
  totalEdgeDiff,
} from "./solver";

export interface SolveParams {
  n: number;
  m: number;
  cellValueMin: number;
  cellValueMax: number;
  reqMin: number;
  reqMax: number;
  seed: number;
  maxIter: number;
}

export type WorkerMessage =
  | { type: "start"; grid: number[][]; requirements: number[]; initEdgeDiff: number }
  | { type: "progress"; iter: number; maxIter: number; edgeDiff: number; assignment: number[][] }
  | {
      type: "done";
      assignment: number[][];
      finalEdgeDiff: number;
      initEdgeDiff: number;
      scores: number[];
      requirements: number[];
      elapsedMs: number;
    };

self.onmessage = (e: MessageEvent<SolveParams>) => {
  const { n, m, cellValueMin, cellValueMax, reqMin, reqMax, seed, maxIter } = e.data;

  const rng = makePrng(seed);
  const { grid, requirements } = generateData(
    n,
    m,
    [cellValueMin, cellValueMax],
    [reqMin, reqMax],
    rng,
  );

  const asgn = initialAssignment(grid, requirements);
  const initEdgeDiff = totalEdgeDiff(asgn);

  const msg: WorkerMessage = { type: "start", grid, requirements, initEdgeDiff };
  self.postMessage(msg);

  const logInterval = Math.max(1, Math.floor(maxIter / 10));
  const h = asgn.length;
  const w = asgn[0].length;
  const numAssignValues = m + 1; // 0..m

  // --- Simulated Annealing schedule ---
  // Temperature drops from T0 to T0*0.001 over maxIter steps.
  const T0 = Math.max(1, initEdgeDiff * 0.1);
  const alpha = Math.pow(0.001, 1 / maxIter);

  // --- Boundary cell management ---
  // Refresh list of cells that have at least one neighbor with a different value.
  const BOUNDARY_REFRESH = Math.max(1, Math.floor(maxIter / 100));
  let boundaryCells: [number, number][] = [];

  function refreshBoundary(): void {
    boundaryCells = [];
    for (let r = 0; r < h; r++) {
      for (let c = 0; c < w; c++) {
        if (calcLocalScore(asgn, r, c) > 0) boundaryCells.push([r, c]);
      }
    }
  }

  // Pick a cell: 80% from boundary cells, 20% uniformly at random.
  function pickCell(): [number, number] {
    if (boundaryCells.length > 0 && rng() < 0.8) {
      return boundaryCells[randInt(rng, 0, boundaryCells.length - 1)];
    }
    return [randInt(rng, 0, h - 1), randInt(rng, 0, w - 1)];
  }

  refreshBoundary();
  const t0 = performance.now();

  for (let i = 0; i < maxIter; i++) {
    const T = T0 * Math.pow(alpha, i);

    // -- Swap move with SA acceptance --
    const [r1, c1] = pickCell();
    const [r2, c2] = pickCell();
    const currSwap = calcLocalScore(asgn, r1, c1) + calcLocalScore(asgn, r2, c2);
    const tmp = asgn[r1][c1];
    asgn[r1][c1] = asgn[r2][c2];
    asgn[r2][c2] = tmp;
    const nextSwap = calcLocalScore(asgn, r1, c1) + calcLocalScore(asgn, r2, c2);
    const deltaSwap = nextSwap - currSwap;
    if (deltaSwap > 0 && rng() >= Math.exp(-deltaSwap / T)) {
      // revert
      asgn[r2][c2] = asgn[r1][c1];
      asgn[r1][c1] = tmp;
    }

    // -- Single-cell reassignment with SA acceptance --
    const [r3, c3] = pickCell();
    const val = randInt(rng, 0, numAssignValues);
    const old = asgn[r3][c3];
    const currChange = calcLocalScore(asgn, r3, c3);
    asgn[r3][c3] = val;
    const nextChange = calcLocalScore(asgn, r3, c3);
    const deltaChange = nextChange - currChange;
    if (deltaChange > 0 && rng() >= Math.exp(-deltaChange / T)) {
      // revert
      asgn[r3][c3] = old;
    }

    // Periodically refresh boundary cell list
    if ((i + 1) % BOUNDARY_REFRESH === 0) {
      refreshBoundary();
    }

    if ((i + 1) % logInterval === 0) {
      const progressMsg: WorkerMessage = {
        type: "progress",
        iter: i + 1,
        maxIter,
        edgeDiff: totalEdgeDiff(asgn),
        assignment: asgn.map((row) => [...row]), // snapshot copy
      };
      self.postMessage(progressMsg);
    }
  }

  const elapsedMs = performance.now() - t0;
  const finalEdgeDiff = totalEdgeDiff(asgn);
  const scores = playerScores(grid, asgn, m);

  const doneMsg: WorkerMessage = {
    type: "done",
    assignment: asgn,
    finalEdgeDiff,
    initEdgeDiff,
    scores,
    requirements,
    elapsedMs,
  };
  self.postMessage(doneMsg);
};
