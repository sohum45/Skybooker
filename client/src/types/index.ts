export interface Airport {
  id: string;
  code: string;
  name: string;
  city: string;
  country: string;
  lat: number;
  lon: number;
}

export interface RouteSegment {
  from: string;
  to: string;
  distanceKm: number;
}

export interface RouteResult {
  path: string[];
  segments: RouteSegment[];
  totalDistance: number;
}

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

export interface Booking {
  id: string;
  pnr: string;
  userId: string;
  path: string[];
  fareBreakdown: FareBreakdown;
  total: number;
  fareClass: string;
  createdAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface PriceConfig {
  id: string;
  fuelPricePerLitre: number;
  defaultBurnLPerKm: number;
  taxRate: number;
  feeRate: number;
  baseFare: number;
  updatedAt: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface WebSocketMessage {
  type: "price:update" | "route:recomputed" | "booking:created";
  data: any;
}
