import { breakingPool, mockNewsItems } from "@/lib/news/mockData";
import type { CorrelationProvider } from "./provider";
import type { CorrelationEdge, RelevancePath } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// MOCK CORRELATION GRAPH — hand-curated, consistent with lib/news/mockData.ts.
//
// PRODUCTION NOTE: in the real product this is a maintained dataset (curated
// symbology + sector/macro relationships, versioned and reviewed like the
// historical events database). It is NEVER AI-generated at request time —
// every chain shown to a user must be traceable data.
//
// Invariant (asserted below in dev): every `correlatedTickers` entry in the
// mock news data is reachable from at least one of that item's
// `directTickers`, so a correlated watchlist hit can always show its chain.
// ─────────────────────────────────────────────────────────────────────────────

/** Plain-language labels for group/event nodes; tickers render as-is. */
const GROUP_LABELS: Record<string, string> = {
  semiconductors: "semiconductors",
  "megacap-tech": "megacap tech",
  rates: "rates",
  crude: "crude",
  energy: "energy",
  gold: "gold",
  crypto: "crypto",
  financials: "financials",
  "us-equity-indices": "US equity indices",
  "obesity-drugs": "GLP-1 / obesity drugs",
  autos: "autos",
  logistics: "logistics",
  "china-equities": "China equities",
};

const label = (id: string) => GROUP_LABELS[id];

// Edge order is the deterministic tie-break for equal-length paths, so the
// canonical chains (semis → indices, macro → rates → 10Y) are seeded first.
const EDGES: CorrelationEdge[] = [
  // ── semiconductors complex ────────────────────────────────────────────────
  { from: "NVDA", to: "semiconductors", kind: "member-of", label: label("semiconductors") },
  { from: "AMD", to: "semiconductors", kind: "member-of", label: label("semiconductors") },
  { from: "AVGO", to: "semiconductors", kind: "member-of", label: label("semiconductors") },
  { from: "TSM", to: "semiconductors", kind: "member-of", label: label("semiconductors") },
  { from: "MU", to: "semiconductors", kind: "member-of", label: label("semiconductors") },
  { from: "semiconductors", to: "SOXX", kind: "weights" },
  { from: "semiconductors", to: "SMH", kind: "weights" },
  { from: "semiconductors", to: "NQ", kind: "weights" },
  { from: "semiconductors", to: "ES", kind: "weights" },

  // ── megacap tech → index complex ──────────────────────────────────────────
  { from: "AAPL", to: "megacap-tech", kind: "member-of", label: label("megacap-tech") },
  { from: "MSFT", to: "megacap-tech", kind: "member-of", label: label("megacap-tech") },
  { from: "GOOGL", to: "megacap-tech", kind: "member-of", label: label("megacap-tech") },
  { from: "AMZN", to: "megacap-tech", kind: "member-of", label: label("megacap-tech") },
  { from: "META", to: "megacap-tech", kind: "member-of", label: label("megacap-tech") },
  { from: "NVDA", to: "megacap-tech", kind: "member-of", label: label("megacap-tech") },
  { from: "TSLA", to: "megacap-tech", kind: "member-of", label: label("megacap-tech") },
  { from: "NFLX", to: "megacap-tech", kind: "member-of", label: label("megacap-tech") },
  { from: "ORCL", to: "megacap-tech", kind: "member-of", label: label("megacap-tech") },
  { from: "megacap-tech", to: "NQ", kind: "weights" },
  { from: "megacap-tech", to: "ES", kind: "weights" },
  { from: "megacap-tech", to: "QQQ", kind: "weights" },
  { from: "megacap-tech", to: "SPY", kind: "weights" },

  // ── macro releases → rates → everything ──────────────────────────────────
  { from: "CPI", to: "rates", kind: "macro-driver", label: label("rates") },
  { from: "FOMC", to: "rates", kind: "macro-driver", label: label("rates") },
  { from: "NFP", to: "rates", kind: "macro-driver", label: label("rates") },
  { from: "rates", to: "10Y", kind: "macro-driver" },
  { from: "rates", to: "2Y", kind: "macro-driver" },
  { from: "TLT", to: "rates", kind: "proxy", label: label("rates") },
  { from: "ZN", to: "10Y", kind: "proxy" },
  { from: "10Y", to: "NQ", kind: "macro-driver" },
  { from: "10Y", to: "ES", kind: "macro-driver" },
  { from: "10Y", to: "SPY", kind: "macro-driver" },
  { from: "10Y", to: "QQQ", kind: "macro-driver" },
  { from: "10Y", to: "DXY", kind: "macro-driver" },
  { from: "10Y", to: "gold", kind: "macro-driver", label: label("gold") },

  // ── dollar inverses ───────────────────────────────────────────────────────
  { from: "DXY", to: "gold", kind: "inverse", label: label("gold") },
  { from: "DXY", to: "EUR/USD", kind: "inverse" },

  // ── gold complex ──────────────────────────────────────────────────────────
  { from: "GLD", to: "gold", kind: "proxy", label: label("gold") },
  { from: "GC", to: "gold", kind: "proxy", label: label("gold") },
  { from: "GDX", to: "gold", kind: "member-of", label: label("gold") },

  // ── crude → energy complex ────────────────────────────────────────────────
  { from: "CL", to: "crude", kind: "proxy", label: label("crude") },
  { from: "USO", to: "crude", kind: "proxy", label: label("crude") },
  { from: "crude", to: "energy", kind: "macro-driver", label: label("energy") },
  { from: "energy", to: "XLE", kind: "weights" },
  { from: "XOM", to: "energy", kind: "member-of", label: label("energy") },
  { from: "CVX", to: "energy", kind: "member-of", label: label("energy") },

  // ── US equity index complex ───────────────────────────────────────────────
  { from: "NQ", to: "us-equity-indices", kind: "member-of", label: label("us-equity-indices") },
  { from: "ES", to: "us-equity-indices", kind: "member-of", label: label("us-equity-indices") },
  { from: "SPX", to: "us-equity-indices", kind: "member-of", label: label("us-equity-indices") },
  { from: "QQQ", to: "NQ", kind: "proxy" },
  { from: "SPY", to: "ES", kind: "proxy" },

  // ── crypto complex ────────────────────────────────────────────────────────
  { from: "BTC", to: "crypto", kind: "member-of", label: label("crypto") },
  { from: "COIN", to: "crypto", kind: "member-of", label: label("crypto") },
  { from: "HOOD", to: "crypto", kind: "member-of", label: label("crypto") },
  { from: "IBIT", to: "BTC", kind: "proxy" },

  // ── financials ────────────────────────────────────────────────────────────
  { from: "JPM", to: "financials", kind: "member-of", label: label("financials") },
  { from: "KRE", to: "financials", kind: "member-of", label: label("financials") },
  { from: "financials", to: "XLF", kind: "weights" },

  // ── smaller sector groups (reachability for the remaining mock items) ────
  { from: "LLY", to: "obesity-drugs", kind: "member-of", label: label("obesity-drugs") },
  { from: "NVO", to: "obesity-drugs", kind: "member-of", label: label("obesity-drugs") },
  { from: "GM", to: "autos", kind: "member-of", label: label("autos") },
  { from: "F", to: "autos", kind: "member-of", label: label("autos") },
  { from: "TSLA", to: "autos", kind: "member-of", label: label("autos") },
  { from: "ZIM", to: "logistics", kind: "member-of", label: label("logistics") },
  { from: "FDX", to: "logistics", kind: "member-of", label: label("logistics") },
  { from: "FXI", to: "china-equities", kind: "weights", label: label("china-equities") },
  { from: "BABA", to: "china-equities", kind: "member-of", label: label("china-equities") },
];

/** Longest chain the provider will surface: 3 edges (4 nodes). */
const MAX_DEPTH = 3;

// Adjacency built once, scanning EDGES in seed order. Edges are stored
// directed (the kind reads from → to) but traversed undirected: relevance
// flows both ways along a relationship (NVDA is relevant to NQ through
// semiconductors, and vice versa). Insertion order per node preserves the
// deterministic tie-break.
const adjacency = new Map<string, string[]>();
function link(a: string, b: string) {
  if (!adjacency.has(a)) adjacency.set(a, []);
  const list = adjacency.get(a)!;
  if (!list.includes(b)) list.push(b);
}
for (const e of EDGES) {
  link(e.from, e.to);
  link(e.to, e.from);
}

const displayName = (node: string) => GROUP_LABELS[node] ?? node;

/**
 * Multi-source BFS: shortest path from any `from` node to each reachable
 * `to` node, at most MAX_DEPTH edges. Ties break deterministically — sources
 * are seeded in argument order and neighbors expand in edge seed order.
 */
/** Tickers/event nodes are uppercase ids; group ids stay as seeded. */
const normalize = (s: string) => (s in GROUP_LABELS ? s : s.toUpperCase());

function findPaths(from: string[], to: string[]): RelevancePath[] {
  const sources = from.map(normalize);
  const parent = new Map<string, string | null>();
  const depth = new Map<string, number>();
  const queue: string[] = [];
  for (const s of sources) {
    if (!parent.has(s)) {
      parent.set(s, null);
      depth.set(s, 0);
      queue.push(s);
    }
  }
  for (let i = 0; i < queue.length; i++) {
    const node = queue[i];
    const d = depth.get(node)!;
    if (d >= MAX_DEPTH) continue;
    for (const next of adjacency.get(node) ?? []) {
      if (parent.has(next)) continue;
      parent.set(next, node);
      depth.set(next, d + 1);
      queue.push(next);
    }
  }

  const paths: RelevancePath[] = [];
  for (const rawTarget of to) {
    const target = normalize(rawTarget);
    if (!parent.has(target)) continue;
    const nodes: string[] = [];
    for (let n: string | null = target; n !== null; n = parent.get(n) ?? null) {
      nodes.unshift(n);
    }
    // A target that is itself a source has a zero-length "path" — no chain
    // to display, so it is omitted (it's a direct hit, not a correlation).
    if (nodes.length < 2) continue;
    paths.push({ nodes, display: nodes.map(displayName).join(" → ") });
  }
  return paths;
}

export class MockCorrelationProvider implements CorrelationProvider {
  async getPaths(from: string[], to: string[]): Promise<RelevancePath[]> {
    return findPaths(from, to);
  }
}

// ─── Dev-time reachability assertion ─────────────────────────────────────────
// Every correlatedTickers entry in the mock news data (feed seeds + breaking
// pool) must be reachable from at least one of that item's directTickers or
// pairs. Items with no direct tickers are skipped — they have no chain
// origin to trace from, and the UI renders their correlated tags without a
// path. Fails loudly in dev so a new mock item can't ship an untraceable
// correlation.
if (process.env.NODE_ENV !== "production") {
  const failures: string[] = [];
  const seeds = [...mockNewsItems, ...breakingPool];
  for (const item of seeds) {
    const origins = [...(item.directTickers ?? []), ...(item.pairs ?? [])];
    const targets = item.correlatedTickers ?? [];
    if (origins.length === 0 || targets.length === 0) continue;
    const reached = new Set(
      findPaths(origins, targets).map((p) => p.nodes[p.nodes.length - 1]),
    );
    for (const t of targets) {
      if (!reached.has(t.toUpperCase()) && !origins.includes(t)) {
        failures.push(`"${item.headline.slice(0, 60)}": ${origins.join("/")} ↛ ${t}`);
      }
    }
  }
  if (failures.length > 0) {
    throw new Error(
      `Correlation graph invariant violated — correlated tickers unreachable from direct tickers:\n${failures.join("\n")}`,
    );
  }
}
