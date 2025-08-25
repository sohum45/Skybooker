import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { 
  loginSchema, 
  registerSchema, 
  routeComputeSchema, 
  priceQuoteSchema,
} from "@shared/schema";
import { verifyAccessToken } from "./services/auth";
import { computeRoute } from "./services/graph";
import { generatePriceQuote } from "./services/pricing";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import cors from "cors";
import fetch from "node-fetch";
import { z } from "zod";

// -----------------------------
// Middleware helpers
// -----------------------------
interface AuthenticatedRequest extends Request {
  user?: { userId: string; email: string; role: string };
}

function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

async function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ message: "Authentication required" });

  const payload = verifyAccessToken(token);
  if (!payload) return res.status(401).json({ message: "Invalid or expired token" });

  req.user = payload;
  next();
}

async function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
}

// -----------------------------
// WebSocket setup
// -----------------------------
const wsClients = new Set<WebSocket>();
function broadcastToClients(message: any) {
  wsClients.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  });
}

// -----------------------------
// External API setup
// -----------------------------
const AERODATABOX_API_KEY = process.env.AERODATABOX_API_KEY || "";
const AERODATABOX_HOST = "aerodatabox.p.rapidapi.com";

// -----------------------------
// Rate Limiters
// -----------------------------
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { message: "Too many auth attempts, please try again later" },
});

const priceLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { message: "Too many pricing requests, please try again later" },
});

// -----------------------------
// Routes
// -----------------------------
export async function registerRoutes(app: Express): Promise<Server> {
  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: process.env.NODE_ENV === "development" ? false : undefined,
  }));
  app.use(cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
    credentials: true,
  }));

  // ✅ Airports (local DB)
  app.get("/api/airports", asyncHandler(async (req, res) => {
    const search = req.query.search as string | undefined;
    const airports = await storage.getAllAirports();

    if (!search) return res.json(airports);

    const filtered = airports.filter(a =>
      a.code.toLowerCase().includes(search.toLowerCase()) ||
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.city.toLowerCase().includes(search.toLowerCase())
    );
    return res.json(filtered);
  }));

  app.get("/api/airports/:code", asyncHandler(async (req, res) => {
    const airport = await storage.getAirportByCode(req.params.code.toUpperCase());
    if (!airport) return res.status(404).json({ message: "Airport not found" });
    return res.json(airport);
  }));

  // ✅ Route computation
  app.get("/api/route", asyncHandler(async (req, res) => {
    const schema = z.object({
      from: z.string().length(3),
      to: z.string().length(3),
      algorithm: z.string().default("dijkstra"),
    });
    const { from, to, algorithm } = schema.parse(req.query);

    const airports = await storage.getAllAirports();
    const routes = await storage.getActiveRoutes();

    const result = await computeRoute(airports, routes, from, to, algorithm);
    if (!result) return res.status(404).json({ message: "No route found" });

    broadcastToClients({ type: "route:recomputed", data: { from, to, algorithm, ...result } });
    return res.json(result);
  }));

  // ✅ Price quote
  app.get("/api/quote", priceLimiter, asyncHandler(async (req, res) => {
    const schema = z.object({
      from: z.string().length(3),
      to: z.string().length(3),
      pax: z.coerce.number().int().positive().default(1),
      algorithm: z.string().default("dijkstra"),
    });
    const { from, to, pax, algorithm } = schema.parse(req.query);

    const airports = await storage.getAllAirports();
    const routes = await storage.getActiveRoutes();

    const routeResult = await computeRoute(airports, routes, from, to, algorithm);
    if (!routeResult) return res.status(404).json({ message: "No route found for pricing" });

    const priceConfig = await storage.getPriceConfig();
    if (!priceConfig) return res.status(500).json({ message: "Price configuration not found" });

    const offers = generatePriceQuote(routeResult.path, routeResult.totalDistance, pax, priceConfig);
    return res.json({ route: routeResult, offers, config: priceConfig });
  }));

  // -----------------------------
  // HTTP + WS Server
  // -----------------------------
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  wss.on("connection", (ws) => {
    wsClients.add(ws);
    ws.on("close", () => wsClients.delete(ws));
    ws.on("error", (err) => {
      console.error("WebSocket error:", err);
      wsClients.delete(ws);
    });
  });

  return httpServer;
}
