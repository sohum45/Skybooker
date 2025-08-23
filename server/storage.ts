import {
  users,
  airports,
  routeEdges,
  bookings,
  priceConfig,
  type User,
  type InsertUser,
  type Airport,
  type InsertAirport,
  type RouteEdge,
  type InsertRouteEdge,
  type Booking,
  type InsertBooking,
  type PriceConfig,
  type InsertPriceConfig,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Airport operations
  getAllAirports(): Promise<Airport[]>;
  getAirportByCode(code: string): Promise<Airport | undefined>;
  createAirport(airport: InsertAirport): Promise<Airport>;

  // Route operations
  getAllRoutes(): Promise<RouteEdge[]>;
  getActiveRoutes(): Promise<RouteEdge[]>;
  createRoute(route: InsertRouteEdge): Promise<RouteEdge>;

  // Booking operations
  getUserBookings(userId: string): Promise<Booking[]>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  getBookingByPnr(pnr: string): Promise<Booking | undefined>;

  // Price config operations
  getPriceConfig(): Promise<PriceConfig>;
  updatePriceConfig(config: Partial<InsertPriceConfig>): Promise<PriceConfig>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  // Airport operations
  async getAllAirports(): Promise<Airport[]> {
    return await db.select().from(airports);
  }

  async getAirportByCode(code: string): Promise<Airport | undefined> {
    const [airport] = await db.select().from(airports).where(eq(airports.code, code));
    return airport;
  }

  async createAirport(insertAirport: InsertAirport): Promise<Airport> {
    const [airport] = await db
      .insert(airports)
      .values(insertAirport)
      .returning();
    return airport;
  }

  // Route operations
  async getAllRoutes(): Promise<RouteEdge[]> {
    return await db.select().from(routeEdges);
  }

  async getActiveRoutes(): Promise<RouteEdge[]> {
    return await db.select().from(routeEdges).where(eq(routeEdges.active, true));
  }

  async createRoute(insertRoute: InsertRouteEdge): Promise<RouteEdge> {
    const [route] = await db
      .insert(routeEdges)
      .values(insertRoute)
      .returning();
    return route;
  }

  // Booking operations
  async getUserBookings(userId: string): Promise<Booking[]> {
    return await db
      .select()
      .from(bookings)
      .where(eq(bookings.userId, userId))
      .orderBy(desc(bookings.createdAt));
  }

  async createBooking(insertBooking: InsertBooking): Promise<Booking> {
    const [booking] = await db
      .insert(bookings)
      .values({
        userId: insertBooking.userId,
        pnr: insertBooking.pnr,
        path: insertBooking.path,
        fareBreakdown: insertBooking.fareBreakdown,
        total: insertBooking.total,
        fareClass: insertBooking.fareClass,
      })
      .returning();
    return booking;
  }

  async getBookingByPnr(pnr: string): Promise<Booking | undefined> {
    const [booking] = await db.select().from(bookings).where(eq(bookings.pnr, pnr));
    return booking;
  }

  // Price config operations
  async getPriceConfig(): Promise<PriceConfig> {
    let [config] = await db.select().from(priceConfig).where(eq(priceConfig.id, "singleton"));
    
    if (!config) {
      // Create default config if it doesn't exist
      [config] = await db
        .insert(priceConfig)
        .values({ id: "singleton" })
        .returning();
    }
    
    return config;
  }

  async updatePriceConfig(configUpdate: Partial<InsertPriceConfig>): Promise<PriceConfig> {
    const [config] = await db
      .update(priceConfig)
      .set({ ...configUpdate, updatedAt: new Date() })
      .where(eq(priceConfig.id, "singleton"))
      .returning();
    return config;
  }
}

export const storage = new DatabaseStorage();
