import { useEffect, useRef } from "react";
import { Airport, RouteSegment } from "@/types";

interface RouteMapProps {
  airports: Airport[];
  path: string[];
  segments?: RouteSegment[];
  className?: string;
}

declare global {
  interface Window {
    L: any;
  }
}

export default function RouteMap({ airports, path, segments, className = "h-96" }: RouteMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    // Load Leaflet dynamically
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
    if (mapInstanceRef.current && airports.length > 0) {
      updateMap();
    }
  }, [airports, path, segments]);

  const initializeMap = () => {
    if (!mapRef.current || !window.L) return;

    // Initialize map centered on India
    mapInstanceRef.current = window.L.map(mapRef.current).setView([20.5937, 78.9629], 5);

    // Add tile layer
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(mapInstanceRef.current);

    updateMap();
  };

  const updateMap = () => {
    if (!mapInstanceRef.current || !window.L) return;

    // Clear existing markers and polylines
    mapInstanceRef.current.eachLayer((layer: any) => {
      if (layer instanceof window.L.Marker || layer instanceof window.L.Polyline) {
        mapInstanceRef.current.removeLayer(layer);
      }
    });

    // Add airport markers
    airports.forEach((airport) => {
      const marker = window.L.marker([airport.lat, airport.lon])
        .addTo(mapInstanceRef.current)
        .bindPopup(`<b>${airport.code}</b><br/>${airport.name}<br/>${airport.city}`);
    });

    // Add route polyline if path exists
    if (path.length > 1) {
      const routeCoords = path
        .map((code) => {
          const airport = airports.find((a) => a.code === code);
          return airport ? [airport.lat, airport.lon] : null;
        })
        .filter(Boolean);

      if (routeCoords.length > 1) {
        window.L.polyline(routeCoords, {
          color: '#3b82f6',
          weight: 4,
          opacity: 0.8
        }).addTo(mapInstanceRef.current);

        // Fit map to show the route
        if (routeCoords.length > 0) {
          const group = new window.L.featureGroup(
            routeCoords.map(coord => window.L.marker(coord))
          );
          mapInstanceRef.current.fitBounds(group.getBounds().pad(0.1));
        }
      }
    }
  };

  return (
    <div 
      ref={mapRef} 
      className={`w-full rounded-xl border border-gray-200 ${className}`}
      data-testid="route-map"
    />
  );
}
