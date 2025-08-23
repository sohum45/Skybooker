import { sql } from "drizzle-orm";
import { 
  pgTable, 
  varchar, 
  text, 
  timestamp, 
  real, 
  integer, 
  boolean, 
  jsonb,
  index
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (required for auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique().notNull(),
  passwordHash: varchar("password_hash").notNull(),
  name: varchar("name").notNull(),
  role: varchar("role").default("user").notNull(), // "user" | "admin"
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Airports table
export const airports = pgTable("airports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 3 }).unique().notNull(),
  name: varchar("name").notNull(),
  city: varchar("city").notNull(),
  country: varchar("country").notNull(),
  lat: real("lat").notNull(),
  lon: real("lon").notNull(),
}, (table) => [
  index("idx_airport_code").on(table.code),
]);

// Route edges table
export const routeEdges = pgTable("route_edges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  from: varchar("from", { length: 3 }).notNull(),
  to: varchar("to", { length: 3 }).notNull(),
  distanceKm: real("distance_km").notNull(),
  active: boolean("active").default(true).notNull(),
}, (table) => [
  index("idx_route_from_to").on(table.from, table.to),
]);

// Price configuration table
export const priceConfig = pgTable("price_config", {
  id: varchar("id").primaryKey().default("singleton"),
  fuelPricePerLitre: real("fuel_price_per_litre").default(95.50).notNull(),
  defaultBurnLPerKm: real("default_burn_l_per_km").default(1.62).notNull(),
  taxRate: real("tax_rate").default(0.18).notNull(),
  feeRate: real("fee_rate").default(0.08).notNull(),
  baseFare: real("base_fare").default(1500).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Bookings table
export const bookings = pgTable("bookings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  pnr: varchar("pnr", { length: 8 }).unique().notNull(),
  userId: varchar("user_id").notNull(),
  path: jsonb("path").$type<string[]>().notNull(),
  fareBreakdown: jsonb("fare_breakdown").$type<{
    base: number;
    fuelCost: number;
    ops: number;
    taxes: number;
    demand: number;
  }>().notNull(),
  total: real("total").notNull(),
  fareClass: varchar("fare_class").notNull(), // "Saver" | "Standard" | "Flex"
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_booking_user_date").on(table.userId, table.createdAt),
  index("idx_booking_pnr").on(table.pnr),
]);

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  bookings: many(bookings),
}));

export const bookingsRelations = relations(bookings, ({ one }) => ({
  user: one(users, {
    fields: [bookings.userId],
    references: [users.id],
  }),
}));

export const routeEdgesRelations = relations(routeEdges, ({ one }) => ({
  fromAirport: one(airports, {
    fields: [routeEdges.from],
    references: [airports.code],
  }),
  toAirport: one(airports, {
    fields: [routeEdges.to],
    references: [airports.code],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertAirportSchema = createInsertSchema(airports).omit({
  id: true,
});

export const insertRouteEdgeSchema = createInsertSchema(routeEdges).omit({
  id: true,
});

export const insertBookingSchema = createInsertSchema(bookings).omit({
  id: true,
  pnr: true,
  createdAt: true,
});

export const insertPriceConfigSchema = createInsertSchema(priceConfig).omit({
  updatedAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Airport = typeof airports.$inferSelect;
export type InsertAirport = z.infer<typeof insertAirportSchema>;

export type RouteEdge = typeof routeEdges.$inferSelect;
export type InsertRouteEdge = z.infer<typeof insertRouteEdgeSchema>;

export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;

export type PriceConfig = typeof priceConfig.$inferSelect;
export type InsertPriceConfig = z.infer<typeof insertPriceConfigSchema>;

// Auth schemas
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;

// Route computation schemas
export const routeComputeSchema = z.object({
  from: z.string().length(3),
  to: z.string().length(3),
  algo: z.enum(["dijkstra", "astar"]),
});

export const priceQuoteSchema = z.object({
  path: z.array(z.string().length(3)),
  pax: z.number().int().positive(),
});

export type RouteComputeInput = z.infer<typeof routeComputeSchema>;
export type PriceQuoteInput = z.infer<typeof priceQuoteSchema>;
