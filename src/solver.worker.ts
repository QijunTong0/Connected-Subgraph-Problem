// solver.worker.ts — Web Worker that runs solve_assignment off the main thread
// Port of heuristic.solve_assignment

import {
  generateData,
  initialAssignment,
  makePrng,
  playerScores,
  randInt,
  totalEdgeDiff,
  tryChangeSingleAssignment,
  trySwapAssignment,
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
  lambdaReq: number;
  saTemp: number;
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
  const { n, m, cellValueMin, cellValueMax, reqMin, reqMax, seed, maxIter, lambdaReq, saTemp } = e.data;

  const rng = makePrng(seed);
  const { grid, requirements } = generateData(
    n,
    m,
    [cellValueMin, cellValueMax],
    [reqMin, reqMax],
    rng,
  );

  const asgn = initialAssignment(grid, requirements, rng);
  const initEdgeDiff = totalEdgeDiff(asgn);

  const msg: WorkerMessage = { type: "start", grid, requirements, initEdgeDiff };
  self.postMessage(msg);

  const logInterval = Math.max(1, Math.floor(maxIter / 10));
  const h = asgn.length;
  const w = asgn[0].length;
  const numAssignValues = m + 1; // 0..m

  // Running scores maintained in-place to avoid recomputing every iteration
  const scores = playerScores(grid, asgn, m);

  // Geometric cooling: T(i) = saTemp × (Tmin/saTemp)^(i/maxIter), Tmin=1e-3
  const T_MIN = 1e-3;

  const t0 = performance.now();

  for (let i = 0; i < maxIter; i++) {
    const T = saTemp > 0
      ? saTemp * Math.pow(T_MIN / saTemp, i / maxIter)
      : 0;

    const r1 = randInt(rng, 0, h - 1);
    const c1 = randInt(rng, 1, w - 1);
    const r2 = randInt(rng, 0, h - 1);
    const c2 = randInt(rng, 1, w - 1);
    const r3 = randInt(rng, 0, h - 1);
    const c3 = randInt(rng, 1, w - 1);
    const val = randInt(rng, 0, numAssignValues);

    trySwapAssignment(asgn, grid, scores, requirements, lambdaReq, T, rng, [r1, c1], [r2, c2]);
    tryChangeSingleAssignment(asgn, grid, scores, requirements, lambdaReq, T, rng, [r3, c3], val);

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
