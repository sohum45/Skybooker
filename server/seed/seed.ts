import { storage } from "../storage";
import { haversineKm } from "../utils/haversine";

const airports = [
  { code: "DEL", name: "Indira Gandhi Intl", city: "Delhi", country: "India", lat: 28.556, lon: 77.100 },
  { code: "BOM", name: "Chhatrapati Shivaji", city: "Mumbai", country: "India", lat: 19.089, lon: 72.865 },
  { code: "BLR", name: "Kempegowda", city: "Bangalore", country: "India", lat: 13.198, lon: 77.706 },
  { code: "HYD", name: "Rajiv Gandhi", city: "Hyderabad", country: "India", lat: 17.24, lon: 78.43 },
  { code: "MAA", name: "Chennai Intl", city: "Chennai", country: "India", lat: 12.99, lon: 80.17 },
  { code: "CCU", name: "Netaji Subhas Chandra", city: "Kolkata", country: "India", lat: 22.65, lon: 88.44 },
  { code: "PNQ", name: "Pune", city: "Pune", country: "India", lat: 18.58, lon: 73.92 },
  { code: "GOI", name: "Goa", city: "Goa", country: "India", lat: 15.38, lon: 73.83 },
  { code: "AMD", name: "Ahmedabad", city: "Ahmedabad", country: "India", lat: 23.07, lon: 72.63 },
  { code: "COK", name: "Cochin Intl", city: "Kochi", country: "India", lat: 10.15, lon: 76.40 }
];

const routePairs = [
  ["DEL", "BOM"],
  ["DEL", "BLR"],
  ["DEL", "CCU"],
  ["BOM", "GOI"],
  ["BOM", "PNQ"],
  ["BOM", "AMD"],
  ["BLR", "MAA"],
  ["BLR", "HYD"],
  ["HYD", "MAA"],
  ["CCU", "MAA"],
  ["MAA", "COK"],
];

export async function seedDatabase() {
  console.log("Seeding airports...");
  
  // Seed airports
  for (const airport of airports) {
    try {
      await storage.createAirport(airport);
      console.log(`Created airport: ${airport.code} - ${airport.name}`);
    } catch (error) {
      console.log(`Airport ${airport.code} already exists or error occurred`);
    }
  }

  console.log("Seeding routes...");
  
  // Seed routes
  const airportMap = new Map(airports.map(a => [a.code, a]));
  
  for (const [from, to] of routePairs) {
    const fromAirport = airportMap.get(from);
    const toAirport = airportMap.get(to);
    
    if (fromAirport && toAirport) {
      const distance = haversineKm(fromAirport, toAirport);
      
      try {
        await storage.createRoute({
          from,
          to,
          distanceKm: Math.round(distance),
          active: true,
        });
        console.log(`Created route: ${from} → ${to} (${Math.round(distance)} km)`);
      } catch (error) {
        console.log(`Route ${from} → ${to} already exists or error occurred`);
      }
    }
  }

  console.log("Database seeding completed!");
}

// Run seed if called directly
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase().catch(console.error);
}
