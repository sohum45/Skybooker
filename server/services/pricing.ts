import { PriceConfig } from "@shared/schema";
import { nanoid } from "nanoid";

export interface FareBreakdown {
  base: number;
  fuelCost: number;
  ops: number;
  taxes: number;
  demand: number;
}

export interface Offer {
  offerId: string;
  class: "Saver" | "Standard" | "Flex";
  fareBreakdown: FareBreakdown;
  totalFare: number;
  currency: string;
}

function roundToNearest10(value: number): number {
  return Math.round(value / 10) * 10;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// Simple demand factor calculation based on route popularity
// In a real system, this would consider actual booking data
function calculateDemandFactor(path: string[]): number {
  // Simulate demand based on route length and common routes
  const routeKey = path.join("-");
  const popularRoutes = ["DEL-BOM", "BOM-DEL", "DEL-BLR", "BLR-DEL"];
  
  let baseDemand = 1.0;
  
  if (popularRoutes.includes(routeKey)) {
    baseDemand = 1.2; // Higher demand for popular routes
  }
  
  // Add some randomness to simulate real-time demand
  const randomFactor = 0.9 + Math.random() * 0.4; // 0.9 to 1.3
  
  return clamp(baseDemand * randomFactor, 0.9, 1.5);
}

export function generatePriceQuote(
  path: string[],
  totalDistanceKm: number,
  pax: number,
  config: PriceConfig
): Offer[] {
  const base = config.baseFare;
  const fuelCost = totalDistanceKm * config.defaultBurnLPerKm * config.fuelPricePerLitre;
  const ops = config.feeRate * (base + fuelCost);
  const taxes = config.taxRate * (base + fuelCost + ops);
  const demand = calculateDemandFactor(path);
  
  const fareBreakdown: FareBreakdown = {
    base,
    fuelCost,
    ops,
    taxes,
    demand,
  };

  const corePrice = (base + fuelCost + ops + taxes) * demand;

  const classes = [
    { name: "Saver", multiplier: 0.95 },
    { name: "Standard", multiplier: 1.0 },
    { name: "Flex", multiplier: 1.15 },
  ] as const;

  return classes.map((fareClass) => ({
    offerId: nanoid(),
    class: fareClass.name,
    fareBreakdown,
    totalFare: roundToNearest10(corePrice * fareClass.multiplier) * pax,
    currency: "INR",
  }));
}
