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
// initialAssignment — Seed-and-Grow BFS
//
// 1. Place one seed per player, maximally spread across the grid (tile-based).
// 2. Grow each seed via a max-heap (highest cell value first), respecting the
//    per-player score upper bound (1.2 × requirement).
// 3. After BFS, assign any remaining cells to unsatisfied players greedily.
// ---------------------------------------------------------------------------
export function initialAssignment(grid: number[][], requirements: number[]): number[][] {
  const n = grid.length;
  const m = requirements.length;
  const asgn: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  const upper = requirements.map((r) => Math.floor(r * 1.2));
  const scores = new Array<number>(m).fill(0);
  const satisfied = new Array<boolean>(m).fill(false);

  // --- Step 1: place seeds via tile partition ---
  // Divide grid into m tiles; pick the highest-value cell in each tile as seed.
  const tilesPerDim = Math.ceil(Math.sqrt(m));
  const tileH = Math.ceil(n / tilesPerDim);
  const tileW = Math.ceil(n / tilesPerDim);
  const seeds: [number, number][] = [];
  outer: for (let tr = 0; tr < tilesPerDim && seeds.length < m; tr++) {
    for (let tc = 0; tc < tilesPerDim && seeds.length < m; tc++) {
      let bestVal = -Infinity;
      let bestR = tr * tileH;
      let bestC = tc * tileW;
      for (let r = tr * tileH; r < Math.min((tr + 1) * tileH, n); r++) {
        for (let c = tc * tileW; c < Math.min((tc + 1) * tileW, n); c++) {
          if (grid[r][c] > bestVal) {
            bestVal = grid[r][c];
            bestR = r;
            bestC = c;
          }
        }
      }
      seeds.push([bestR, bestC]);
    }
  }
  // Assign seeds
  for (let k = 0; k < m; k++) {
    const [sr, sc] = seeds[k];
    const v = grid[sr][sc];
    if (v <= upper[k] - scores[k]) {
      asgn[sr][sc] = k + 1;
      scores[k] += v;
      if (scores[k] >= requirements[k]) satisfied[k] = true;
    }
  }

  // --- Step 2: BFS expansion (max-heap by cell value) ---
  // Each entry: [negValue, row, col, playerIndex] (negate for min-heap as max-heap)
  type HeapEntry = [number, number, number, number];
  const heap: HeapEntry[] = [];

  const heapPush = (entry: HeapEntry) => {
    heap.push(entry);
    let i = heap.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (heap[parent][0] <= heap[i][0]) break;
      [heap[parent], heap[i]] = [heap[i], heap[parent]];
      i = parent;
    }
  };
  const heapPop = (): HeapEntry => {
    const top = heap[0];
    const last = heap.pop()!;
    if (heap.length > 0) {
      heap[0] = last;
      let i = 0;
      while (true) {
        const l = 2 * i + 1;
        const r = 2 * i + 2;
        let smallest = i;
        if (l < heap.length && heap[l][0] < heap[smallest][0]) smallest = l;
        if (r < heap.length && heap[r][0] < heap[smallest][0]) smallest = r;
        if (smallest === i) break;
        [heap[i], heap[smallest]] = [heap[smallest], heap[i]];
        i = smallest;
      }
    }
    return top;
  };

  const dirs: [number, number][] = [[0, 1], [0, -1], [1, 0], [-1, 0]];
  // Seed neighbors into the heap
  for (let k = 0; k < m; k++) {
    const [sr, sc] = seeds[k];
    for (const [dr, dc] of dirs) {
      const nr = sr + dr;
      const nc = sc + dc;
      if (nr >= 0 && nr < n && nc >= 0 && nc < n && asgn[nr][nc] === 0) {
        heapPush([-grid[nr][nc], nr, nc, k]);
      }
    }
  }

  while (heap.length > 0) {
    const [negVal, r, c, k] = heapPop();
    if (asgn[r][c] !== 0) continue; // already claimed
    if (satisfied[k]) continue;     // player done

    const v = -negVal;
    const cap = upper[k] - scores[k];
    if (v > cap) continue; // would exceed upper bound

    asgn[r][c] = k + 1;
    scores[k] += v;
    if (scores[k] >= requirements[k]) satisfied[k] = true;

    // Push unvisited neighbors for the same player
    for (const [dr, dc] of dirs) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < n && nc >= 0 && nc < n && asgn[nr][nc] === 0) {
        heapPush([-grid[nr][nc], nr, nc, k]);
      }
    }
  }

  // --- Step 3: greedy fallback for remaining unsatisfied players ---
  const remaining: [number, number, number][] = [];
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (asgn[i][j] === 0) remaining.push([grid[i][j], i, j]);
    }
  }
  remaining.sort((a, b) => b[0] - a[0]);

  for (const [v, i, j] of remaining) {
    if (satisfied.every(Boolean)) break;
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
    asgn[i][j] = bestK + 1;
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
