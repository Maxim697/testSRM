/* ==========================================================================
   Procedural circuit-board graph, generated fresh for one exact canvas size
   — no tiling, no repeats, no pre-baked artwork. The whole visible board is
   one connected graph:

   - Junction nodes sit on a jittered grid spanning the canvas.
   - A random spanning tree (Kruskal's algorithm over shuffled grid
     adjacency) guarantees every node is reachable from every other node —
     the graph is connected by construction, not by luck.
   - Extra random edges are layered on top for loops/branching, then any
     node still left with fewer than 2 edges gets one more if a candidate
     is available — real PCBs are mostly junctions, rarely dead ends.
   - Nodes on the outer ring additionally get a short stub edge poking past
     the canvas edge, with the far end marked `toNodeId: null`. These are
     the only edges a comet may enter the screen from or leave through.
   ========================================================================== */

export type PcbNode = { id: number; x: number; y: number };
export type PcbEdge = {
  id: number;
  fromNodeId: number | null;
  toNodeId: number | null;
  points: [number, number][];
  width: number;
};
export type PcbGraph = {
  nodes: PcbNode[];
  edges: PcbEdge[];
  /** nodeId -> ids of every edge touching it (interior + off-screen stubs). */
  adjacency: Map<number, number[]>;
};

export function mulberry32(seed: number) {
  let a = seed;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CELL = 44; // grid spacing in px — matches the previous artwork's trace density
const JITTER = CELL * 0.3;
const DIAGONAL_PROB = 0.32;
const EXTRA_EDGE_PROB = 0.3;
const STUB_LEN = 60; // how far an off-screen stub reaches past the canvas edge
const STUB_SPACING = 3; // every Nth boundary node gets an off-screen exit

export function generatePcbGraph(width: number, height: number, seed: number): PcbGraph {
  const rand = mulberry32(seed);
  const cols = Math.max(2, Math.ceil(width / CELL) + 1);
  const rows = Math.max(2, Math.ceil(height / CELL) + 1);
  const idOf = (c: number, r: number) => r * cols + c;
  const has = (c: number, r: number) => c >= 0 && c < cols && r >= 0 && r < rows;

  // 1. Jittered grid of junction nodes.
  const nodes: PcbNode[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * CELL + (rand() - 0.5) * 2 * JITTER;
      const y = r * CELL + (rand() - 0.5) * 2 * JITTER;
      nodes.push({ id: idOf(c, r), x, y });
    }
  }

  // 2. Candidate grid-adjacency edges (orthogonal always, diagonal sometimes).
  const candidates: [number, number][] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const id = idOf(c, r);
      if (has(c + 1, r)) candidates.push([id, idOf(c + 1, r)]);
      if (has(c, r + 1)) candidates.push([id, idOf(c, r + 1)]);
      if (rand() < DIAGONAL_PROB && has(c + 1, r + 1)) candidates.push([id, idOf(c + 1, r + 1)]);
      if (rand() < DIAGONAL_PROB && has(c - 1, r + 1)) candidates.push([id, idOf(c - 1, r + 1)]);
    }
  }
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = candidates[i]!;
    candidates[i] = candidates[j]!;
    candidates[j] = tmp;
  }

  // 3. Random spanning tree via union-find — the graph is connected by
  // construction: the grid adjacency itself is one connected mesh, and a
  // spanning tree touches every node in it.
  const parent = new Int32Array(nodes.length);
  for (let i = 0; i < parent.length; i++) parent[i] = i;
  function find(x: number): number {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]!]!;
      x = parent[x]!;
    }
    return x;
  }
  function union(a: number, b: number): boolean {
    const ra = find(a);
    const rb = find(b);
    if (ra === rb) return false;
    parent[ra] = rb;
    return true;
  }

  const key = (a: number, b: number) => (a < b ? `${a}_${b}` : `${b}_${a}`);
  const kept = new Set<string>();
  const pairs: [number, number][] = [];
  for (const [a, b] of candidates) {
    if (union(a, b)) {
      kept.add(key(a, b));
      pairs.push([a, b]);
    }
  }

  // 4. Extra loop edges for junction density (real boards aren't trees).
  for (const [a, b] of candidates) {
    const k = key(a, b);
    if (!kept.has(k) && rand() < EXTRA_EDGE_PROB) {
      kept.add(k);
      pairs.push([a, b]);
    }
  }

  // 5. Patch any node left with fewer than 2 edges, using a spare candidate
  // if one exists — keeps genuine dead ends rare, as comets need somewhere
  // to go.
  const neighborCandidates = new Map<number, number[]>();
  for (const [a, b] of candidates) {
    (neighborCandidates.get(a) ?? neighborCandidates.set(a, []).get(a)!).push(b);
    (neighborCandidates.get(b) ?? neighborCandidates.set(b, []).get(b)!).push(a);
  }
  const degree = new Map<number, number>();
  const bump = (id: number) => degree.set(id, (degree.get(id) ?? 0) + 1);
  for (const [a, b] of pairs) {
    bump(a);
    bump(b);
  }
  for (const node of nodes) {
    if ((degree.get(node.id) ?? 0) >= 2) continue;
    for (const other of neighborCandidates.get(node.id) ?? []) {
      const k = key(node.id, other);
      if (kept.has(k)) continue;
      kept.add(k);
      pairs.push([node.id, other]);
      bump(node.id);
      bump(other);
      if ((degree.get(node.id) ?? 0) >= 2) break;
    }
  }

  // 6. Build real edges from the kept pairs.
  const edges: PcbEdge[] = [];
  let nextEdgeId = 0;
  const widthFor = () => 1.3 + rand() * 1.1;
  for (const [a, b] of pairs) {
    const na = nodes[a]!;
    const nb = nodes[b]!;
    edges.push({
      id: nextEdgeId++,
      fromNodeId: a,
      toNodeId: b,
      points: [
        [na.x, na.y],
        [nb.x, nb.y],
      ],
      width: widthFor(),
    });
  }

  // 7. Off-screen stub edges on the outer ring — the only edges with a null
  // endpoint, and the only ones a comet may spawn on.
  let boundaryCount = 0;
  function maybeStub(c: number, r: number, dx: number, dy: number) {
    boundaryCount++;
    if (boundaryCount % STUB_SPACING !== 0) return;
    const node = nodes[idOf(c, r)]!;
    edges.push({
      id: nextEdgeId++,
      fromNodeId: node.id,
      toNodeId: null,
      points: [
        [node.x, node.y],
        [node.x + dx * STUB_LEN, node.y + dy * STUB_LEN],
      ],
      width: widthFor(),
    });
    bump(node.id);
  }
  for (let c = 0; c < cols; c++) {
    maybeStub(c, 0, 0, -1);
    maybeStub(c, rows - 1, 0, 1);
  }
  for (let r = 0; r < rows; r++) {
    maybeStub(0, r, -1, 0);
    maybeStub(cols - 1, r, 1, 0);
  }

  // 8. Adjacency index for comet junction-hopping.
  const adjacency = new Map<number, number[]>();
  for (const edge of edges) {
    if (edge.fromNodeId !== null) {
      (adjacency.get(edge.fromNodeId) ?? adjacency.set(edge.fromNodeId, []).get(edge.fromNodeId)!).push(edge.id);
    }
    if (edge.toNodeId !== null) {
      (adjacency.get(edge.toNodeId) ?? adjacency.set(edge.toNodeId, []).get(edge.toNodeId)!).push(edge.id);
    }
  }

  const deadEnds = nodes.filter((n) => (degree.get(n.id) ?? 0) < 2).length;
  console.log(
    `[circuit-bg] nodes=${nodes.length} edges=${edges.length} deadEnds(<2 routes)=${deadEnds}`,
  );

  return { nodes, edges, adjacency };
}
