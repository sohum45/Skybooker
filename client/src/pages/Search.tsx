import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import AirportSearch from "@/components/AirportSearch";
import RouteMap from "@/components/RouteMap";
import OfferCard from "@/components/OfferCard";
import { apiRequest } from "@/lib/api";
import { socketService } from "@/lib/socket";
import { Airport, RouteResult, Offer } from "@/types";
import { Search, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function SearchPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [fromAirport, setFromAirport] = useState("");
  const [toAirport, setToAirport] = useState("");
  const [algorithm, setAlgorithm] = useState<"dijkstra" | "astar">("dijkstra");
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);

  const { data: airports = [] } = useQuery<Airport[]>({
    queryKey: ["/api/airports"],
  });

  const routeMutation = useMutation({
    mutationFn: (data: { from: string; to: string; algo: "dijkstra" | "astar" }) =>
      apiRequest("POST", "/route/compute", data),
    onSuccess: (data: RouteResult) => {
      setRouteResult(data);
      // Automatically get price quotes
      priceMutation.mutate({ path: data.path, pax: 1 });
    },
    onError: (error) => {
      toast({
        title: "Route Computation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const priceMutation = useMutation({
    mutationFn: (data: { path: string[]; pax: number }) =>
      apiRequest("POST", "/price/quote", data),
    onSuccess: (data: Offer[]) => {
      setOffers(data);
    },
    onError: (error) => {
      toast({
        title: "Price Quote Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    // Connect to WebSocket for real-time updates
    socketService.connect();

    const handlePriceUpdate = (data: any) => {
      toast({
        title: "Price Update",
        description: `Fuel price updated to ₹${data.fuelPricePerLitre}/L. Prices may have changed.`,
      });
      
      // Refresh price quotes if we have a route
      if (routeResult) {
        priceMutation.mutate({ path: routeResult.path, pax: 1 });
      }
    };

    const handleRouteRecomputed = (data: any) => {
      toast({
        title: "Route Recomputed",
        description: `Route from ${data.from} to ${data.to} using ${data.algo} algorithm.`,
      });
    };

    socketService.on("price:update", handlePriceUpdate);
    socketService.on("route:recomputed", handleRouteRecomputed);

    return () => {
      socketService.off("price:update", handlePriceUpdate);
      socketService.off("route:recomputed", handleRouteRecomputed);
    };
  }, [routeResult, priceMutation, toast]);

  const handleSearch = () => {
    if (!fromAirport || !toAirport) {
      toast({
        title: "Missing Information",
        description: "Please select both departure and destination airports.",
        variant: "destructive",
      });
      return;
    }

    if (fromAirport === toAirport) {
      toast({
        title: "Invalid Route",
        description: "Departure and destination airports cannot be the same.",
        variant: "destructive",
      });
      return;
    }

    routeMutation.mutate({ from: fromAirport, to: toAirport, algo: algorithm });
  };

  const handleOfferSelect = (offer: Offer) => {
    setSelectedOffer(offer);
    // Navigate to offers page with the selected offer
    setLocation(`/offers?offerId=${offer.offerId}`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-primary-800 via-primary-600 to-sky-500 rounded-3xl p-8 mb-8 text-white">
        <div className="max-w-4xl">
          <h1 className="text-4xl md:text-5xl font-bold mb-4" data-testid="text-hero-title">
            Find Your Perfect Flight
          </h1>
          <p className="text-xl text-blue-100 mb-8">
            Advanced route optimization with real-time pricing
          </p>
          
          {/* Search Form */}
          <div className="bg-white rounded-2xl p-6 text-gray-900">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="lg:col-span-2">
                <AirportSearch
                  label="From"
                  value={fromAirport}
                  onChange={setFromAirport}
                  placeholder="Delhi (DEL)"
                />
              </div>

              <div className="lg:col-span-2">
                <AirportSearch
                  label="To"
                  value={toAirport}
                  onChange={setToAirport}
                  placeholder="Mumbai (BOM)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Algorithm
                </label>
                <Select value={algorithm} onValueChange={(value: "dijkstra" | "astar") => setAlgorithm(value)}>
                  <SelectTrigger data-testid="select-algorithm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dijkstra">Dijkstra (Shortest)</SelectItem>
                    <SelectItem value="astar">A* (Optimized)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="mt-6 flex justify-center">
              <Button 
                onClick={handleSearch}
                disabled={routeMutation.isPending}
                className="px-8 py-3"
                data-testid="button-search"
              >
                <Search className="w-5 h-5 mr-2" />
                {routeMutation.isPending ? "Searching..." : "Search Flights"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Results Section */}
      {routeResult && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Map Section */}
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-gray-900">Route Visualization</h3>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span data-testid="text-route-info">
                      Route: {routeResult.path.join(" → ")} ({Math.round(routeResult.totalDistance)} km)
                    </span>
                  </div>
                </div>
                
                <RouteMap 
                  airports={airports}
                  path={routeResult.path}
                  segments={routeResult.segments}
                />
                
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center space-x-2 text-sm text-blue-800">
                    <Info className="w-4 h-4" />
                    <span>
                      <strong>Algorithm:</strong> {algorithm === "dijkstra" ? "Dijkstra's shortest path" : "A* optimized search"} • 
                      <strong> Distance:</strong> {Math.round(routeResult.totalDistance)} km • 
                      <strong> Flight Time:</strong> ~{Math.round(routeResult.totalDistance / 500 * 60)}m
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Flight Options */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">Available Flights</h3>
              {priceMutation.isPending && (
                <div className="text-sm text-gray-600">Loading prices...</div>
              )}
            </div>
            
            {offers.map((offer) => (
              <OfferCard
                key={offer.offerId}
                offer={offer}
                onSelect={handleOfferSelect}
              />
            ))}

            {offers.length === 0 && !priceMutation.isPending && routeResult && (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-gray-600">No flight options available for this route.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!routeResult && !routeMutation.isPending && (
        <div className="text-center py-12">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-12 h-12 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Ready to Search</h3>
          <p className="text-gray-600">
            Enter your departure and destination airports to find the best flight routes
          </p>
        </div>
      )}
    </div>
  );
}
