// solver.ts — TypeScript port of formulation/heuristic.py

// ---------------------------------------------------------------------------
// Seeded PRNG (Mulberry32)
// JavaScript's Math.random() has no seed support; this gives reproducibility.
// ---------------------------------------------------------------------------
export function makePrng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randInt(rng: () => number, lo: number, hi: number): number {
  return lo + Math.floor(rng() * (hi - lo + 1));
}

// ---------------------------------------------------------------------------
// Data generation — port of utils.generate_data
// ---------------------------------------------------------------------------
export interface ProblemData {
  grid: number[][];
  requirements: number[];
}

export function generateData(
  n: number,
  m: number,
  cellValueRange: [number, number],
  reqRange: [number, number],
  rng: () => number,
): ProblemData {
  const [cvLo, cvHi] = cellValueRange;
  const [rqLo, rqHi] = reqRange;
  const grid: number[][] = Array.from({ length: n }, () =>
    Array.from({ length: n }, () => randInt(rng, cvLo, cvHi)),
  );
  const requirements: number[] = Array.from({ length: m }, () => randInt(rng, rqLo, rqHi));
  return { grid, requirements };
}

// ---------------------------------------------------------------------------
// initial_assignment — region-growing (BFS) to guarantee connected regions
// ---------------------------------------------------------------------------
export function initialAssignment(
  grid: number[][],
  requirements: number[],
  rng: () => number,
): number[][] {
  const n = grid.length;
  const m = requirements.length;
  const asgn: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  const scores = new Array<number>(m).fill(0);
  const satisfied = new Array<boolean>(m).fill(false);
  const DIRS: [number, number][] = [[0, 1], [0, -1], [1, 0], [-1, 0]];

  // Step 1: Place m distinct random seed cells
  const taken = new Set<number>();
  for (let k = 0; k < m; k++) {
    let r: number, c: number;
    do {
      r = randInt(rng, 0, n - 1);
      c = randInt(rng, 0, n - 1);
    } while (taken.has(r * n + c));
    taken.add(r * n + c);
    asgn[r][c] = k + 1;
    scores[k] = grid[r][c];
    if (scores[k] >= requirements[k]) satisfied[k] = true;
  }

  // Step 2: Initialize BFS frontiers from seeds
  // frontier[k] = candidate cells adjacent to player k's territory (may include stale entries)
  const frontiers: [number, number][][] = Array.from({ length: m }, () => []);
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const k = asgn[r][c] - 1;
      if (k < 0) continue;
      for (const [dr, dc] of DIRS) {
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < n && nc >= 0 && nc < n && asgn[nr][nc] === 0) {
          frontiers[k].push([nr, nc]);
        }
      }
    }
  }

  // Step 3: Greedy BFS expansion — player with most need expands first
  while (!satisfied.every(Boolean)) {
    // Pick the unsatisfied player with the largest remaining deficit
    let bestK = -1;
    let bestNeed = -1;
    for (let k = 0; k < m; k++) {
      if (satisfied[k]) continue;
      const need = requirements[k] - scores[k];
      if (need > bestNeed) { bestNeed = need; bestK = k; }
    }
    if (bestK < 0) break;

    // Find best unoccupied cell in this player's frontier (highest grid value)
    const frontier = frontiers[bestK];
    let bestIdx = -1;
    let bestVal = -Infinity;
    for (let i = 0; i < frontier.length; i++) {
      const [r, c] = frontier[i];
      if (asgn[r][c] !== 0) continue; // stale entry — skip
      if (grid[r][c] > bestVal) { bestVal = grid[r][c]; bestIdx = i; }
    }

    if (bestIdx < 0) {
      // No reachable unoccupied cell — give up on this player
      satisfied[bestK] = true;
      continue;
    }

    const [nr, nc] = frontier[bestIdx];
    asgn[nr][nc] = bestK + 1;
    scores[bestK] += grid[nr][nc];
    if (scores[bestK] >= requirements[bestK]) satisfied[bestK] = true;

    // Expand frontier with new neighbours
    for (const [dr, dc] of DIRS) {
      const r2 = nr + dr, c2 = nc + dc;
      if (r2 >= 0 && r2 < n && c2 >= 0 && c2 < n && asgn[r2][c2] === 0) {
        frontiers[bestK].push([r2, c2]);
      }
    }
  }

  return asgn;
}

// ---------------------------------------------------------------------------
// calc_local_score — port of heuristic.calc_local_score
// ---------------------------------------------------------------------------
export function calcLocalScore(asgn: number[][], r: number, c: number): number {
  const h = asgn.length;
  const w = asgn[0].length;
  let score = 0;
  if (c + 1 < w) score += asgn[r][c] !== asgn[r][c + 1] ? 1 : 0;
  if (c - 1 >= 0) score += asgn[r][c] !== asgn[r][c - 1] ? 1 : 0;
  if (r + 1 < h) score += asgn[r][c] !== asgn[r + 1][c] ? 1 : 0;
  if (r - 1 >= 0) score += asgn[r][c] !== asgn[r - 1][c] ? 1 : 0;
  return score;
}

// ---------------------------------------------------------------------------
// try_swap_assignment — composite loss + simulated annealing acceptance
// ---------------------------------------------------------------------------
export function trySwapAssignment(
  asgn: number[][],
  grid: number[][],
  scores: number[],
  requirements: number[],
  lambdaReq: number,
  temperature: number,
  rng: () => number,
  pos1: [number, number],
  pos2: [number, number],
): boolean {
  const [r1, c1] = pos1;
  const [r2, c2] = pos2;

  const oldEdge = calcLocalScore(asgn, r1, c1) + calcLocalScore(asgn, r2, c2);

  // Compute Δ_req for affected players (k1, k2 are 1-indexed; 0 means empty)
  const k1 = asgn[r1][c1];
  const k2 = asgn[r2][c2];
  let deltaReq = 0;
  if (lambdaReq !== 0 && k1 !== k2) {
    const v1 = grid[r1][c1];
    const v2 = grid[r2][c2];
    if (k1 > 0) {
      const oldViol = Math.max(0, requirements[k1 - 1] - scores[k1 - 1]);
      const newViol = Math.max(0, requirements[k1 - 1] - (scores[k1 - 1] - v1 + v2));
      deltaReq += newViol - oldViol;
    }
    if (k2 > 0) {
      const oldViol = Math.max(0, requirements[k2 - 1] - scores[k2 - 1]);
      const newViol = Math.max(0, requirements[k2 - 1] - (scores[k2 - 1] - v2 + v1));
      deltaReq += newViol - oldViol;
    }
  }

  const tmp = asgn[r1][c1];
  asgn[r1][c1] = asgn[r2][c2];
  asgn[r2][c2] = tmp;
  const newEdge = calcLocalScore(asgn, r1, c1) + calcLocalScore(asgn, r2, c2);

  const delta = newEdge - oldEdge + lambdaReq * deltaReq;
  const accept = delta < 0 || (temperature > 0 && rng() < Math.exp(-delta / temperature));

  if (accept) {
    if (k1 !== k2) {
      const v1 = grid[r1][c1];
      const v2 = grid[r2][c2];
      if (k1 > 0) scores[k1 - 1] += v2 - v1;
      if (k2 > 0) scores[k2 - 1] += v1 - v2;
    }
    return true;
  }
  // Revert
  asgn[r2][c2] = asgn[r1][c1];
  asgn[r1][c1] = tmp;
  return false;
}

// ---------------------------------------------------------------------------
// try_change_single_assignment — composite loss + simulated annealing acceptance
// ---------------------------------------------------------------------------
export function tryChangeSingleAssignment(
  asgn: number[][],
  grid: number[][],
  scores: number[],
  requirements: number[],
  lambdaReq: number,
  temperature: number,
  rng: () => number,
  pos: [number, number],
  newValue: number,
): boolean {
  const [r, c] = pos;
  const kOld = asgn[r][c];
  const kNew = newValue;
  if (kOld === kNew) return false;

  const oldEdge = calcLocalScore(asgn, r, c);

  // Compute Δ_req
  let deltaReq = 0;
  if (lambdaReq !== 0) {
    const v = grid[r][c];
    if (kOld > 0) {
      const oldViol = Math.max(0, requirements[kOld - 1] - scores[kOld - 1]);
      const newViol = Math.max(0, requirements[kOld - 1] - (scores[kOld - 1] - v));
      deltaReq += newViol - oldViol;
    }
    if (kNew > 0) {
      const oldViol = Math.max(0, requirements[kNew - 1] - scores[kNew - 1]);
      const newViol = Math.max(0, requirements[kNew - 1] - (scores[kNew - 1] + v));
      deltaReq += newViol - oldViol;
    }
  }

  asgn[r][c] = kNew;
  const newEdge = calcLocalScore(asgn, r, c);

  const delta = newEdge - oldEdge + lambdaReq * deltaReq;
  const accept = delta < 0 || (temperature > 0 && rng() < Math.exp(-delta / temperature));

  if (accept) {
    const v = grid[r][c];
    if (kOld > 0) scores[kOld - 1] -= v;
    if (kNew > 0) scores[kNew - 1] += v;
    return true;
  }
  asgn[r][c] = kOld;
  return false;
}

// ---------------------------------------------------------------------------
// _total_edge_diff — port of heuristic._total_edge_diff
// ---------------------------------------------------------------------------
export function totalEdgeDiff(asgn: number[][]): number {
  const h = asgn.length;
  const w = asgn[0].length;
  let count = 0;
  for (let i = 0; i < h; i++) {
    for (let j = 0; j < w - 1; j++) {
      if (asgn[i][j] !== asgn[i][j + 1]) count++;
    }
  }
  for (let i = 0; i < h - 1; i++) {
    for (let j = 0; j < w; j++) {
      if (asgn[i][j] !== asgn[i + 1][j]) count++;
    }
  }
  return count;
}

// ---------------------------------------------------------------------------
// Player score helper
// ---------------------------------------------------------------------------
export function playerScores(grid: number[][], asgn: number[][], m: number): number[] {
  return Array.from({ length: m }, (_, k) => {
    const id = k + 1;
    let sum = 0;
    for (let i = 0; i < grid.length; i++) {
      for (let j = 0; j < grid[0].length; j++) {
        if (asgn[i][j] === id) sum += grid[i][j];
      }
    }
    return sum;
  });
}
