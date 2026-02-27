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
// initial_assignment — greedy tightest-window-first
// Port of heuristic.initial_assignment
// ---------------------------------------------------------------------------
export function initialAssignment(grid: number[][], requirements: number[]): number[][] {
  const n = grid.length;
  const m = requirements.length;
  const asgn: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  const upper = requirements.map((r) => Math.floor(r * 1.2));
  const scores = new Array<number>(m).fill(0);
  const satisfied = new Array<boolean>(m).fill(false);

  // Collect all cells and sort by value descending
  const cells: [number, number, number][] = [];
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      cells.push([grid[i][j], i, j]);
    }
  }
  cells.sort((a, b) => b[0] - a[0]);

  for (const [v, i, j] of cells) {
    if (satisfied.every(Boolean)) break;

    // Assign to the player with the tightest remaining capacity window
    let bestK = -1;
    let bestCap = Infinity;
    for (let k = 0; k < m; k++) {
      if (satisfied[k]) continue;
      const need = requirements[k] - scores[k];
      if (need <= 0) continue;
      const cap = upper[k] - scores[k];
      if (v > cap) continue;
      if (cap < bestCap) {
        bestCap = cap;
        bestK = k;
      }
    }
    if (bestK < 0) continue;

    asgn[i][j] = bestK + 1; // 1-indexed player ID
    scores[bestK] += v;
    if (scores[bestK] >= requirements[bestK]) satisfied[bestK] = true;
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
// try_swap_assignment — port of heuristic.try_swap_assignment
// ---------------------------------------------------------------------------
export function trySwapAssignment(
  asgn: number[][],
  pos1: [number, number],
  pos2: [number, number],
): boolean {
  const [r1, c1] = pos1;
  const [r2, c2] = pos2;
  const curr = calcLocalScore(asgn, r1, c1) + calcLocalScore(asgn, r2, c2);
  const tmp = asgn[r1][c1];
  asgn[r1][c1] = asgn[r2][c2];
  asgn[r2][c2] = tmp;
  const next = calcLocalScore(asgn, r1, c1) + calcLocalScore(asgn, r2, c2);
  if (next >= curr) {
    // revert
    asgn[r2][c2] = asgn[r1][c1];
    asgn[r1][c1] = tmp;
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// try_change_single_assignment — port of heuristic.try_change_single_assigment
// ---------------------------------------------------------------------------
export function tryChangeSingleAssignment(
  asgn: number[][],
  pos: [number, number],
  newValue: number,
): boolean {
  const [r, c] = pos;
  const old = asgn[r][c];
  const curr = calcLocalScore(asgn, r, c);
  asgn[r][c] = newValue;
  const next = calcLocalScore(asgn, r, c);
  if (next < curr) return true;
  asgn[r][c] = old;
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
