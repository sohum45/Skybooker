import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/api";
import { socketService } from "@/lib/socket";
import { PriceConfig } from "@/types";
import { 
  Users, 
  FileText, 
  MapPin, 
  DollarSign, 
  TrendingUp,
  Clock,
  Plane,
  AlertCircle,
  Settings
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AdminPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [pricingForm, setPricingForm] = useState({
    fuelPricePerLitre: 0,
    baseFare: 0,
    taxRate: 0,
    feeRate: 0,
    defaultBurnLPerKm: 0,
  });

  const [activityFeed, setActivityFeed] = useState<Array<{
    id: string;
    type: string;
    message: string;
    timestamp: Date;
    color: string;
  }>>([]);

  // Fetch pricing configuration
  const { data: priceConfig, isLoading: priceConfigLoading } = useQuery<PriceConfig>({
    queryKey: ["/api/admin/pricing"],
  });

  // Fetch admin stats
  const { data: stats } = useQuery({
    queryKey: ["/api/admin/stats"],
  });

  // Default stats if not loaded
  const defaultStats = {
    totalUsers: 1247,
    totalBookings: 583,
    activeRoutes: 45,
    revenueToday: "₹2,45,680"
  };

  // Update pricing mutation
  const updatePricingMutation = useMutation({
    mutationFn: (data: Partial<PriceConfig>) =>
      apiRequest("PUT", "/admin/pricing", data),
    onSuccess: () => {
      toast({
        title: "Pricing Updated",
        description: "Global pricing configuration has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pricing"] });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update pricing configuration",
        variant: "destructive",
      });
    },
  });

  // Initialize form with current config
  useEffect(() => {
    if (priceConfig) {
      setPricingForm({
        fuelPricePerLitre: priceConfig.fuelPricePerLitre,
        baseFare: priceConfig.baseFare,
        taxRate: priceConfig.taxRate * 100, // Convert to percentage
        feeRate: priceConfig.feeRate * 100, // Convert to percentage
        defaultBurnLPerKm: priceConfig.defaultBurnLPerKm,
      });
    }
  }, [priceConfig]);

  // WebSocket for real-time updates
  useEffect(() => {
    socketService.connect();

    const handlePriceUpdate = (data: any) => {
      addToActivityFeed("price:update", `Fuel price updated to ₹${data.fuelPricePerLitre}/L`, "orange");
    };

    const handleRouteRecomputed = (data: any) => {
      addToActivityFeed("route:recomputed", `Route computed: ${data.from} → ${data.to} using ${data.algo}`, "blue");
    };

    const handleBookingCreated = (data: any) => {
      addToActivityFeed("booking:created", `New booking: ${data.pnr} • ${data.path.join(" → ")} • ₹${data.total}`, "green");
    };

    socketService.on("price:update", handlePriceUpdate);
    socketService.on("route:recomputed", handleRouteRecomputed);
    socketService.on("booking:created", handleBookingCreated);

    return () => {
      socketService.off("price:update", handlePriceUpdate);
      socketService.off("route:recomputed", handleRouteRecomputed);
      socketService.off("booking:created", handleBookingCreated);
    };
  }, []);

  const addToActivityFeed = (type: string, message: string, color: string) => {
    const activity = {
      id: Date.now().toString(),
      type,
      message,
      timestamp: new Date(),
      color,
    };
    
    setActivityFeed(prev => [activity, ...prev.slice(0, 9)]); // Keep only last 10 items
  };

  const handlePricingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    updatePricingMutation.mutate({
      fuelPricePerLitre: pricingForm.fuelPricePerLitre,
      baseFare: pricingForm.baseFare,
      taxRate: pricingForm.taxRate / 100, // Convert back to decimal
      feeRate: pricingForm.feeRate / 100, // Convert back to decimal
      defaultBurnLPerKm: pricingForm.defaultBurnLPerKm,
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPricingForm(prev => ({
      ...prev,
      [name]: parseFloat(value) || 0
    }));
  };

  if (priceConfigLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900" data-testid="text-admin-title">
          Admin Dashboard
        </h1>
        <p className="text-gray-600 mt-2">Manage global settings and monitor system activity</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-semibold text-gray-900" data-testid="text-total-users">
                  {(stats as any)?.totalUsers || defaultStats.totalUsers}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Bookings</p>
                <p className="text-2xl font-semibold text-gray-900" data-testid="text-total-bookings">
                  {(stats as any)?.totalBookings || defaultStats.totalBookings}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <MapPin className="w-6 h-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Routes</p>
                <p className="text-2xl font-semibold text-gray-900" data-testid="text-active-routes">
                  {(stats as any)?.activeRoutes || defaultStats.activeRoutes}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Revenue Today</p>
                <p className="text-2xl font-semibold text-gray-900" data-testid="text-revenue-today">
                  {(stats as any)?.revenueToday || defaultStats.revenueToday}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Pricing Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="w-5 h-5" />
              <span>Global Pricing Configuration</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePricingSubmit} className="space-y-6">
              <div>
                <Label htmlFor="fuelPricePerLitre" className="block text-sm font-medium text-gray-700 mb-2">
                  Fuel Price per Litre (₹)
                </Label>
                <div className="relative">
                  <Input
                    id="fuelPricePerLitre"
                    name="fuelPricePerLitre"
                    type="number"
                    step="0.01"
                    min="0"
                    value={pricingForm.fuelPricePerLitre}
                    onChange={handleInputChange}
                    className="pr-12"
                    data-testid="input-fuel-price"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <span className="text-gray-500 text-sm">₹/L</span>
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="baseFare" className="block text-sm font-medium text-gray-700 mb-2">
                  Base Fare (₹)
                </Label>
                <Input
                  id="baseFare"
                  name="baseFare"
                  type="number"
                  min="0"
                  value={pricingForm.baseFare}
                  onChange={handleInputChange}
                  data-testid="input-base-fare"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="taxRate" className="block text-sm font-medium text-gray-700 mb-2">
                    Tax Rate (%)
                  </Label>
                  <Input
                    id="taxRate"
                    name="taxRate"
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={pricingForm.taxRate}
                    onChange={handleInputChange}
                    data-testid="input-tax-rate"
                  />
                </div>
                <div>
                  <Label htmlFor="feeRate" className="block text-sm font-medium text-gray-700 mb-2">
                    Operations Fee (%)
                  </Label>
                  <Input
                    id="feeRate"
                    name="feeRate"
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={pricingForm.feeRate}
                    onChange={handleInputChange}
                    data-testid="input-fee-rate"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="defaultBurnLPerKm" className="block text-sm font-medium text-gray-700 mb-2">
                  Fuel Burn Rate (L/km)
                </Label>
                <Input
                  id="defaultBurnLPerKm"
                  name="defaultBurnLPerKm"
                  type="number"
                  step="0.01"
                  min="0"
                  value={pricingForm.defaultBurnLPerKm}
                  onChange={handleInputChange}
                  data-testid="input-burn-rate"
                />
              </div>

              <Button
                type="submit"
                disabled={updatePricingMutation.isPending}
                className="w-full"
                data-testid="button-update-pricing"
              >
                {updatePricingMutation.isPending ? "Updating..." : "Update Pricing"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Live Activity Feed */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-5 h-5" />
                <span>Live Activity</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>Real-time</span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-96 overflow-y-auto" data-testid="activity-feed">
              {activityFeed.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Waiting for activity...</p>
                </div>
              ) : (
                activityFeed.map((activity) => (
                  <div
                    key={activity.id}
                    className={`flex items-start space-x-3 p-3 bg-${activity.color}-50 rounded-lg`}
                    data-testid={`activity-${activity.type}`}
                  >
                    <div className={`w-8 h-8 bg-${activity.color}-100 rounded-full flex items-center justify-center flex-shrink-0`}>
                      {activity.type === "booking:created" && <FileText className={`w-4 h-4 text-${activity.color}-600`} />}
                      {activity.type === "route:recomputed" && <Plane className={`w-4 h-4 text-${activity.color}-600`} />}
                      {activity.type === "price:update" && <DollarSign className={`w-4 h-4 text-${activity.color}-600`} />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{activity.message}</p>
                      <p className="text-xs text-gray-500">
                        {activity.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Status */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5" />
            <span>System Status</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <div>
                <p className="font-medium text-gray-900">WebSocket</p>
                <p className="text-sm text-gray-600">Connected</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <div>
                <p className="font-medium text-gray-900">Database</p>
                <p className="text-sm text-gray-600">Operational</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <div>
                <p className="font-medium text-gray-900">API Services</p>
                <p className="text-sm text-gray-600">All systems operational</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
