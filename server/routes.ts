import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { 
  loginSchema, 
  registerSchema, 
  routeComputeSchema, 
  priceQuoteSchema,
  insertBookingSchema,
  insertPriceConfigSchema,
  type RouteComputeInput, 
  type PriceQuoteInput 
} from "@shared/schema";
import { hashPassword, verifyPassword, generateTokens, verifyAccessToken } from "./services/auth";
import { computeRoute } from "./services/graph";
import { generatePriceQuote } from "./services/pricing";
import { generatePnr } from "./utils/pnr";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import cors from "cors";

// Rate limiters
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: { message: "Too many auth attempts, please try again later" },
});

const priceLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, // limit each IP to 20 requests per windowMs
  message: { message: "Too many pricing requests, please try again later" },
});

// Auth middleware
interface AuthenticatedRequest extends Request {
  user?: { userId: string; email: string; role: string };
}

async function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const payload = verifyAccessToken(token);
  if (!payload) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }

  req.user = payload;
  next();
}

async function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
}

// WebSocket clients for real-time updates
const wsClients = new Set<WebSocket>();

function broadcastToClients(message: any) {
  wsClients.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: process.env.NODE_ENV === 'development' ? false : undefined,
  }));
  app.use(cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
    credentials: true,
  }));

  // Auth routes
  app.post("/api/auth/register", authLimiter, async (req, res) => {
    try {
      const { email, password, name } = registerSchema.parse(req.body);
      
      // Check if user exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      // Create user
      const passwordHash = await hashPassword(password);
      const user = await storage.createUser({
        email,
        passwordHash,
        name,
        role: "user",
      });

      const tokens = generateTokens(user);
      res.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role }, ...tokens });
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Registration failed" });
    }
  });

  app.post("/api/auth/login", authLimiter, async (req, res) => {
    try {
      const { email, password } = loginSchema.parse(req.body);
      
      const user = await storage.getUserByEmail(email);
      if (!user || !(await verifyPassword(password, user.passwordHash))) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const tokens = generateTokens(user);
      res.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role }, ...tokens });
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Login failed" });
    }
  });

  app.get("/api/auth/me", authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const user = await storage.getUser(req.user!.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({ id: user.id, email: user.email, name: user.name, role: user.role });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Airport routes
  app.get("/api/airports", async (req, res) => {
    try {
      const airports = await storage.getAllAirports();
      res.json(airports);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch airports" });
    }
  });

  app.get("/api/airports/:code", async (req, res) => {
    try {
      const airport = await storage.getAirportByCode(req.params.code.toUpperCase());
      if (!airport) {
        return res.status(404).json({ message: "Airport not found" });
      }
      res.json(airport);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch airport" });
    }
  });

  // Route computation
  app.post("/api/route/compute", async (req, res) => {
    try {
      const { from, to, algo } = routeComputeSchema.parse(req.body);
      
      const airports = await storage.getAllAirports();
      const routes = await storage.getActiveRoutes();
      
      const result = await computeRoute(airports, routes, from, to, algo);
      
      if (!result) {
        return res.status(404).json({ message: "No route found" });
      }

      // Broadcast route computation event
      broadcastToClients({
        type: "route:recomputed",
        data: { from, to, algo, ...result }
      });

      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Route computation failed" });
    }
  });

  // Price quotes
  app.post("/api/price/quote", priceLimiter, async (req, res) => {
    try {
      const { path, pax } = priceQuoteSchema.parse(req.body);
      
      const config = await storage.getPriceConfig();
      const routes = await storage.getActiveRoutes();
      
      // Calculate total distance
      let totalDistance = 0;
      for (let i = 0; i < path.length - 1; i++) {
        const from = path[i];
        const to = path[i + 1];
        const route = routes.find(r => r.from === from && r.to === to);
        if (route) {
          totalDistance += route.distanceKm;
        }
      }

      const offers = generatePriceQuote(path, totalDistance, pax, config);
      res.json(offers);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Price quote failed" });
    }
  });

  // Booking routes
  app.post("/api/bookings", authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const pnr = generatePnr();
      const bookingData = {
        userId: req.user!.userId,
        pnr,
        path: req.body.path,
        fareBreakdown: req.body.fareBreakdown,
        total: req.body.total,
        fareClass: req.body.fareClass,
      };

      const booking = await storage.createBooking(bookingData);

      // Broadcast booking created event
      broadcastToClients({
        type: "booking:created",
        data: {
          pnr: booking.pnr,
          userName: req.user!.email,
          path: booking.path,
          total: booking.total,
        }
      });

      res.json({
        bookingId: booking.id,
        pnr: booking.pnr,
        total: booking.total,
      });
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Booking failed" });
    }
  });

  app.get("/api/bookings", authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const bookings = await storage.getUserBookings(req.user!.userId);
      res.json(bookings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });

  // Admin routes
  app.get("/api/admin/pricing", authenticate, requireAdmin, async (req, res) => {
    try {
      const config = await storage.getPriceConfig();
      res.json(config);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch pricing config" });
    }
  });

  app.put("/api/admin/pricing", authenticate, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const updates = insertPriceConfigSchema.partial().parse(req.body);
      const config = await storage.updatePriceConfig(updates);
      
      // Broadcast price update event
      broadcastToClients({
        type: "price:update",
        data: { fuelPricePerLitre: config.fuelPricePerLitre }
      });

      res.json(config);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to update pricing" });
    }
  });

  app.get("/api/admin/stats", authenticate, requireAdmin, async (req, res) => {
    try {
      // In a real app, these would be actual database queries
      const stats = {
        totalUsers: 1247,
        totalBookings: 583,
        activeRoutes: 45,
        revenueToday: "₹2,45,680"
      };
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);

  // Setup WebSocket server
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/ws' 
  });

  wss.on('connection', (ws) => {
    wsClients.add(ws);
    
    ws.on('close', () => {
      wsClients.delete(ws);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      wsClients.delete(ws);
    });
  });

  return httpServer;
}
