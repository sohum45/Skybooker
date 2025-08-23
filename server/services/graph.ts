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

    // Add edges
    routes.forEach(route => {
      if (route.active) {
        const edge: GraphEdge = {
          from: route.from,
          to: route.to,
          distance: route.distanceKm,
        };
        
        this.edges.get(route.from)?.push(edge);
        
        // Add reverse edge for bidirectional routes
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

  dijkstra(start: string, end: string): RouteResult | null {
    const distances = new Map<string, number>();
    const previous = new Map<string, string | null>();
    const unvisited = new Set<string>();

    // Initialize
    this.nodes.forEach((_, node) => {
      distances.set(node, Infinity);
      previous.set(node, null);
      unvisited.add(node);
    });
    distances.set(start, 0);

    while (unvisited.size > 0) {
      // Find unvisited node with minimum distance
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

      // Update distances to neighbors
      const edges = this.getEdges(current);
      for (const edge of edges) {
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

  astar(start: string, end: string): RouteResult | null {
    const startNode = this.getNode(start);
    const endNode = this.getNode(end);
    
    if (!startNode || !endNode) return null;

    const gScore = new Map<string, number>();
    const fScore = new Map<string, number>();
    const previous = new Map<string, string | null>();
    const openSet = new Set<string>([start]);
    const closedSet = new Set<string>();

    // Initialize
    this.nodes.forEach((_, node) => {
      gScore.set(node, Infinity);
      fScore.set(node, Infinity);
      previous.set(node, null);
    });
    
    gScore.set(start, 0);
    fScore.set(start, haversineKm(startNode.airport, endNode.airport));

    while (openSet.size > 0) {
      // Find node in openSet with lowest fScore
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

      // Examine neighbors
      const edges = this.getEdges(current);
      for (const edge of edges) {
        if (closedSet.has(edge.to)) continue;

        const tentativeGScore = gScore.get(current)! + edge.distance;

        if (!openSet.has(edge.to)) {
          openSet.add(edge.to);
        } else if (tentativeGScore >= gScore.get(edge.to)!) {
          continue;
        }

        // This path is the best so far
        previous.set(edge.to, current);
        gScore.set(edge.to, tentativeGScore);
        
        const neighbor = this.getNode(edge.to)!;
        const heuristic = haversineKm(neighbor.airport, endNode.airport);
        fScore.set(edge.to, tentativeGScore + heuristic);
      }
    }

    return this.buildRouteResult(start, end, previous, gScore);
  }

  private buildRouteResult(
    start: string,
    end: string,
    previous: Map<string, string | null>,
    distances: Map<string, number>
  ): RouteResult | null {
    if (distances.get(end) === Infinity) {
      return null; // No path found
    }

    // Reconstruct path
    const path: string[] = [];
    let current: string | null = end;
    
    while (current !== null) {
      path.unshift(current);
      current = previous.get(current) || null;
    }

    // Build segments
    const segments: Array<{ from: string; to: string; distanceKm: number }> = [];
    let totalDistance = 0;

    for (let i = 0; i < path.length - 1; i++) {
      const from = path[i];
      const to = path[i + 1];
      
      // Find the edge distance
      const edges = this.getEdges(from);
      const edge = edges.find(e => e.to === to);
      const distance = edge?.distance || 0;

      segments.push({
        from,
        to,
        distanceKm: distance,
      });
      
      totalDistance += distance;
    }

    return {
      path,
      segments,
      totalDistance,
    };
  }
}

export async function computeRoute(
  airports: Airport[],
  routes: RouteEdge[],
  from: string,
  to: string,
  algorithm: "dijkstra" | "astar"
): Promise<RouteResult | null> {
  const graph = new Graph(airports, routes);
  
  if (algorithm === "dijkstra") {
    return graph.dijkstra(from, to);
  } else {
    return graph.astar(from, to);
  }
}
