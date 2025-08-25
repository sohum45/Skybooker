import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

console.log('Step 1: Starting script');
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..', '..');
dotenv.config({ path: join(rootDir, '.env') });
console.log('Step 2: Environment loaded');
console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);

let storage, haversineKm;

console.log('Step 3: About to import modules');
try {
  const storageModule = await import("../storage.js");
  storage = storageModule.storage;
  console.log('Step 4: Storage imported');
  
  const haversineModule = await import("../utils/haversine.js");
  haversineKm = haversineModule.haversineKm;
  console.log('Step 5: Haversine imported');
} catch (error) {
  console.error('Import error:', error);
  process.exit(1);
}

console.log('Step 6: Testing database connection');
try {
  const airports = await storage.getAllAirports();
  console.log('Step 7: Database connected, found', airports.length, 'airports');
} catch (error) {
  console.error('Database connection error:', error);
  process.exit(1);
}

console.log('Step 8: About to seed airports');
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

// Create airports
for (const airport of airports) {
  try {
    console.log('Creating airport:', airport.code);
    await storage.createAirport(airport);
    console.log('Created airport:', airport.code);
  } catch (error: any) {
    if (error.code === '23505') {
      console.log('Airport already exists:', airport.code);
    } else {
      console.error('Error creating airport:', error);
    }
  }
}

console.log('Step 9: Creating flight routes');

// Create a map of airports for easy lookup
const airportMap = new Map(airports.map(a => [a.code, a]));

// Define major routes between Indian cities
const routes = [
  // Delhi connections
  ["DEL", "BOM"], ["DEL", "BLR"], ["DEL", "HYD"], ["DEL", "MAA"], 
  ["DEL", "CCU"], ["DEL", "PNQ"], ["DEL", "AMD"], ["DEL", "COK"],
  
  // Mumbai connections  
  ["BOM", "BLR"], ["BOM", "HYD"], ["BOM", "MAA"], ["BOM", "CCU"],
  ["BOM", "PNQ"], ["BOM", "GOI"], ["BOM", "AMD"], ["BOM", "COK"],
  
  // Bangalore connections
  ["BLR", "HYD"], ["BLR", "MAA"], ["BLR", "CCU"], ["BLR", "COK"],
  ["BLR", "GOI"], 
  
  // Hyderabad connections
  ["HYD", "MAA"], ["HYD", "CCU"], ["HYD", "COK"],
  
  // Chennai connections
  ["MAA", "CCU"], ["MAA", "COK"],
  
  // Other connections
  ["CCU", "COK"], ["PNQ", "GOI"], ["AMD", "COK"]
];

for (const [from, to] of routes) {
  const fromAirport = airportMap.get(from);
  const toAirport = airportMap.get(to);
  
  if (fromAirport && toAirport) {
    const distance = haversineKm(
      fromAirport.lat, fromAirport.lon,
      toAirport.lat, toAirport.lon
    );
    
    // Create bidirectional routes
    for (const [source, dest] of [[from, to], [to, from]]) {
      try {
        console.log(`Creating route: ${source} → ${dest} (${Math.round(distance)} km)`);
        await storage.createRoute({
          from: source,
          to: dest,
          distanceKm: distance,
          active: true
        });
        console.log(`Created route: ${source} → ${dest}`);
      } catch (error: any) {
        if (error.code === '23505') {
          console.log(`Route already exists: ${source} → ${dest}`);
        } else {
          console.error(`Error creating route ${source} → ${dest}:`, error);
        }
      }
    }
  }
}

console.log('Step 10: Seeding complete');
process.exit(0);