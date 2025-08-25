import { RouteEdge, Airport } from "@shared/schema";
import { haversineKm } from "../utils/haversine";

export interface GraphNode {
  code: string;
  airport: Airport;
}

export interface GraphEdge {
  from: string;
  to: string;
  distance: number;
}

export interface RouteResult {
  path: string[];
  segments: Array<{
    from: string;
    to: string;
    distanceKm: number;
  }>;
  totalDistance: number;
}

export class Graph {
  private nodes: Map<string, GraphNode> = new Map();
  private edges: Map<string, GraphEdge[]> = new Map();

  constructor(airports: Airport[], routes: RouteEdge[]) {
    // Add nodes
    airports.forEach(airport => {
      this.nodes.set(airport.code, {
        code: airport.code,
        airport,
      });
      this.edges.set(airport.code, []);
    });

    // Add edges (bidirectional)
    routes.forEach(route => {
      if (route.active) {
        const edge: GraphEdge = {
          from: route.from,
          to: route.to,
          distance: route.distanceKm,
        };
        this.edges.get(route.from)?.push(edge);

        const reverseEdge: GraphEdge = {
          from: route.to,
          to: route.from,
          distance: route.distanceKm,
        };
        this.edges.get(route.to)?.push(reverseEdge);
      }
    });
  }

  getNode(code: string): GraphNode | undefined {
    return this.nodes.get(code);
  }

  getEdges(code: string): GraphEdge[] {
    return this.edges.get(code) || [];
  }

  getAllNodes(): GraphNode[] {
    return Array.from(this.nodes.values());
  }

  // ---- Dijkstra ----
  dijkstra(start: string, end: string): RouteResult | null {
    const distances = new Map<string, number>();
    const previous = new Map<string, string | null>();
    const unvisited = new Set<string>();

    this.nodes.forEach((_, node) => {
      distances.set(node, Infinity);
      previous.set(node, null);
      unvisited.add(node);
    });
    distances.set(start, 0);

    while (unvisited.size > 0) {
      let current: string | null = null;
      let minDistance = Infinity;
      unvisited.forEach(node => {
        const dist = distances.get(node)!;
        if (dist < minDistance) {
          minDistance = dist;
          current = node;
        }
      });

      if (!current || minDistance === Infinity) break;
      if (current === end) break;

      unvisited.delete(current);

      for (const edge of this.getEdges(current)) {
        if (!unvisited.has(edge.to)) continue;
        const alt = distances.get(current)! + edge.distance;
        if (alt < distances.get(edge.to)!) {
          distances.set(edge.to, alt);
          previous.set(edge.to, current);
        }
      }
    }

    return this.buildRouteResult(start, end, previous, distances);
  }

  // ---- A* ----
  astar(start: string, end: string): RouteResult | null {
    const startNode = this.getNode(start);
    const endNode = this.getNode(end);
    if (!startNode || !endNode) return null;

    const gScore = new Map<string, number>();
    const fScore = new Map<string, number>();
    const previous = new Map<string, string | null>();
    const openSet = new Set<string>([start]);
    const closedSet = new Set<string>();

    this.nodes.forEach((_, node) => {
      gScore.set(node, Infinity);
      fScore.set(node, Infinity);
      previous.set(node, null);
    });
    gScore.set(start, 0);
    fScore.set(start, haversineKm(startNode.airport, endNode.airport));

    while (openSet.size > 0) {
      let current: string | null = null;
      let minFScore = Infinity;
      openSet.forEach(node => {
        const score = fScore.get(node)!;
        if (score < minFScore) {
          minFScore = score;
          current = node;
        }
      });

      if (!current) break;
      if (current === end) break;

      openSet.delete(current);
      closedSet.add(current);

      for (const edge of this.getEdges(current)) {
        if (closedSet.has(edge.to)) continue;
        const tentativeG = gScore.get(current)! + edge.distance;
        if (!openSet.has(edge.to)) openSet.add(edge.to);
        else if (tentativeG >= gScore.get(edge.to)!) continue;

        previous.set(edge.to, current);
        gScore.set(edge.to, tentativeG);

        const neighbor = this.getNode(edge.to)!;
        const heuristic = haversineKm(neighbor.airport, endNode.airport);
        fScore.set(edge.to, tentativeG + heuristic);
      }
    }

    return this.buildRouteResult(start, end, previous, gScore);
  }

  // ---- Bellman-Ford ----
  bellmanFord(start: string, end: string): RouteResult | null {
    const distances = new Map<string, number>();
    const previous = new Map<string, string | null>();
    this.nodes.forEach((_, node) => {
      distances.set(node, Infinity);
      previous.set(node, null);
    });
    distances.set(start, 0);

    const allEdges: GraphEdge[] = [];
    this.edges.forEach(arr => allEdges.push(...arr));

    const V = this.nodes.size;
    for (let i = 0; i < V - 1; i++) {
      for (const edge of allEdges) {
        if (distances.get(edge.from)! + edge.distance < distances.get(edge.to)!) {
          distances.set(edge.to, distances.get(edge.from)! + edge.distance);
          previous.set(edge.to, edge.from);
        }
      }
    }

    if (distances.get(end) === Infinity) return null;
    return this.buildRouteResult(start, end, previous, distances);
  }

  // ---- Floyd-Warshall ----
  floydWarshall(start: string, end: string): RouteResult | null {
    const nodes = Array.from(this.nodes.keys());
    const n = nodes.length;
    const indexMap = new Map<string, number>();
    nodes.forEach((c, i) => indexMap.set(c, i));

    const dist: number[][] = Array.from({ length: n }, () =>
      Array(n).fill(Infinity)
    );
    const next: (string | null)[][] = Array.from({ length: n }, () =>
      Array(n).fill(null)
    );

    nodes.forEach((u, i) => {
      dist[i][i] = 0;
    });
    this.edges.forEach((edges, u) => {
      const i = indexMap.get(u)!;
      edges.forEach(e => {
        const j = indexMap.get(e.to)!;
        dist[i][j] = e.distance;
        next[i][j] = e.to;
      });
    });

    for (let k = 0; k < n; k++) {
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          if (dist[i][k] + dist[k][j] < dist[i][j]) {
            dist[i][j] = dist[i][k] + dist[k][j];
            next[i][j] = next[i][k];
          }
        }
      }
    }

    const sIdx = indexMap.get(start)!;
    const tIdx = indexMap.get(end)!;
    if (dist[sIdx][tIdx] === Infinity) return null;

    // Reconstruct path
    const path: string[] = [start];
    let u = start;
    while (u !== end) {
      u = next[indexMap.get(u)!][tIdx]!;
      if (!u) break;
      path.push(u);
    }

    // Build segments
    const segments: Array<{ from: string; to: string; distanceKm: number }> = [];
    let totalDistance = 0;
    for (let i = 0; i < path.length - 1; i++) {
      const from = path[i];
      const to = path[i + 1];
      const edge = this.getEdges(from).find(e => e.to === to);
      const d = edge?.distance || 0;
      segments.push({ from, to, distanceKm: d });
      totalDistance += d;
    }

    return { path, segments, totalDistance };
  }

  // ---- Helper to rebuild route ----
  private buildRouteResult(
    start: string,
    end: string,
    previous: Map<string, string | null>,
    distances: Map<string, number>
  ): RouteResult | null {
    if (distances.get(end) === Infinity) return null;

    const path: string[] = [];
    let current: string | null = end;
    while (current !== null) {
      path.unshift(current);
      current = previous.get(current) || null;
    }

    const segments: Array<{ from: string; to: string; distanceKm: number }> = [];
    let totalDistance = 0;
    for (let i = 0; i < path.length - 1; i++) {
      const from = path[i];
      const to = path[i + 1];
      const edge = this.getEdges(from).find(e => e.to === to);
      const d = edge?.distance || 0;
      segments.push({ from, to, distanceKm: d });
      totalDistance += d;
    }

    return { path, segments, totalDistance };
  }
}

// ---- Exposed wrapper ----
export async function computeRoute(
  airports: Airport[],
  routes: RouteEdge[],
  from: string,
  to: string,
  algorithm: "dijkstra" | "astar" | "bellmanford" | "floydwarshall"
): Promise<RouteResult | null> {
  const graph = new Graph(airports, routes);

  switch (algorithm) {
    case "dijkstra":
      return graph.dijkstra(from, to);
    case "astar":
      return graph.astar(from, to);
    case "bellmanford":
      return graph.bellmanFord(from, to);
    case "floydwarshall":
      return graph.floydWarshall(from, to);
    default:
      return null;
  }
}
