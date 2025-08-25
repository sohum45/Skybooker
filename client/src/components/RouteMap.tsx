import { useEffect, useRef } from "react";
import { Airport, RouteSegment } from "@/types";

interface RouteMapProps {
  airports: Airport[];
  path: string[];
  segments?: RouteSegment[];
  className?: string;
  algorithm?: string;
  totalDistance?: number;
}

declare global {
  interface Window {
    L: any;
  }
}

export default function RouteMap({ 
  airports, 
  path, 
  segments, 
  className = "h-96",
  algorithm = "dijkstra",
  totalDistance = 0
}: RouteMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (!window.L) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);

      const script = document.createElement("script");
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.onload = initializeMap;
      document.head.appendChild(script);
    } else {
      initializeMap();
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    console.log("RouteMap update:", { 
      airportsCount: airports.length, 
      pathLength: path.length, 
      segmentsCount: segments?.length || 0,
      totalDistance,
      algorithm
    });
    
    if (mapInstanceRef.current) {
      updateMap();
    }
  }, [airports, path, segments, algorithm, totalDistance]);

  const initializeMap = () => {
    if (!mapRef.current || !window.L) return;

    mapInstanceRef.current = window.L.map(mapRef.current).setView([20.5937, 78.9629], 5);

    window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
    }).addTo(mapInstanceRef.current);

    updateMap();
  };

  const getAlgorithmColor = (algo?: string) => {
    switch (algo) {
      case "dijkstra":
        return "#3b82f6"; // blue
      case "astar":
        return "#f97316"; // orange
      case "bellmanford":
        return "#10b981"; // green
      case "floydwarshall":
        return "#8b5cf6"; // purple
      default:
        return "#3b82f6"; // default blue
    }
  };

  const updateMap = () => {
    if (!mapInstanceRef.current || !window.L) return;

    // Clear existing layers
    mapInstanceRef.current.eachLayer((layer: any) => {
      if (layer instanceof window.L.Marker || layer instanceof window.L.Polyline) {
        mapInstanceRef.current.removeLayer(layer);
      }
    });

    // Add all airport markers first
    airports.forEach((airport) => {
      const isInPath = path.includes(airport.code);
      const marker = window.L.marker([airport.lat, airport.lon], {
        icon: window.L.divIcon({
          html: `<div style="background-color: ${isInPath ? '#3b82f6' : '#6b7280'}; color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold;">${airport.code}</div>`,
          className: 'custom-airport-marker',
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        })
      })
        .addTo(mapInstanceRef.current)
        .bindPopup(`<b>${airport.code}</b><br/>${airport.name}<br/>${airport.city}`);
    });

    // Draw main route path
    if (path.length > 1) {
      console.log("Drawing main route path:", path);
      
      const routeCoords = path
        .map((code) => {
          const airport = airports.find((a) => a.code === code);
          if (!airport) {
            console.warn(`Airport ${code} not found in airports list`);
            return null;
          }
          return [airport.lat, airport.lon];
        })
        .filter(Boolean);

      console.log("Route coordinates:", routeCoords.length);

      if (routeCoords.length > 1) {
        const routeLine = window.L.polyline(routeCoords as [number, number][], {
          color: getAlgorithmColor(algorithm),
          weight: 5,
          opacity: 0.9,
        }).addTo(mapInstanceRef.current);
        
        // Add arrow markers along the route
        for (let i = 0; i < routeCoords.length - 1; i++) {
          const start = routeCoords[i] as [number, number];
          const end = routeCoords[i + 1] as [number, number];
          const midPoint = [
            (start[0] + end[0]) / 2,
            (start[1] + end[1]) / 2
          ] as [number, number];
          
          window.L.marker(midPoint, {
            icon: window.L.divIcon({
              html: '→',
              className: 'route-arrow',
              iconSize: [20, 20],
              iconAnchor: [10, 10]
            })
          }).addTo(mapInstanceRef.current);
        }
        
        console.log("Main route line added to map");
      }
    }

    // Draw individual segments with details (if different from main path)
    if (segments && segments.length > 0) {
      console.log("Drawing detailed segments:", segments);
      
      segments.forEach((seg, index) => {
        const from = airports.find((a) => a.code === seg.from);
        const to = airports.find((a) => a.code === seg.to);

        if (from && to) {
          const segmentLine = window.L.polyline(
            [
              [from.lat, from.lon],
              [to.lat, to.lon],
            ],
            {
              color: getAlgorithmColor(algorithm),
              weight: 3,
              dashArray: "8,4",
              opacity: 0.7,
            }
          ).addTo(mapInstanceRef.current);

          // Handle different property names
          const distance = seg.distanceKm || (seg as any).distance || 0;
          segmentLine.bindTooltip(
            `<strong>${seg.from} → ${seg.to}</strong><br/>Distance: ${distance.toFixed(1)} km`,
            { permanent: false, direction: "center", className: 'custom-tooltip' }
          );
        } else {
          console.warn(`Airports not found for segment ${index}:`, { from: seg.from, to: seg.to });
        }
      });
    }

    // Auto-fit map bounds to show all relevant airports
    const relevantAirports = path.length > 0 
      ? airports.filter(a => path.includes(a.code))
      : airports;
      
    if (relevantAirports.length > 0) {
      const bounds = window.L.latLngBounds(
        relevantAirports.map(a => [a.lat, a.lon])
      );
      mapInstanceRef.current.fitBounds(bounds, { padding: [20, 20] });
    }
  };

  return (
    <div className="relative">
      <div
        ref={mapRef}
        className={`w-full rounded-xl border border-gray-200 ${className}`}
        data-testid="route-map"
      />
      {path.length > 1 && (
        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg border">
          <div className="text-sm font-medium text-gray-900">
            Route: {path.join(' → ')}
          </div>
          <div className="text-xs text-gray-600 mt-1">
            Algorithm: {algorithm} • Distance: {totalDistance.toFixed(1)} km
          </div>
        </div>
      )}
    </div>
  );
}