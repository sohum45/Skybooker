import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PriceBreakdown from "@/components/PriceBreakdown";
import { apiRequest } from "@/lib/api";
import { Offer } from "@/types";
import { ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function OffersPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [passengerDetails, setPassengerDetails] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });

  // In a real app, you'd get the offer from state management or URL params
  // For now, we'll use mock data based on the selected offer type
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const offerId = urlParams.get("offerId");
    
    if (offerId) {
      // Mock offer data - in a real app, this would come from the search results
      const mockOffer: Offer = {
        offerId,
        class: "Standard",
        fareBreakdown: {
          base: 1500,
          fuelCost: 1840,
          ops: 267,
          taxes: 643,
          demand: 1.0,
        },
        totalFare: 4725,
        currency: "INR",
      };
      setSelectedOffer(mockOffer);
    }
  }, []);

  const bookingMutation = useMutation({
    mutationFn: (bookingData: any) =>
      apiRequest("POST", "/bookings", bookingData),
    onSuccess: (data) => {
      toast({
        title: "Booking Confirmed!",
        description: `Your booking has been confirmed. PNR: ${data.pnr}`,
      });
      setLocation("/bookings");
    },
    onError: (error) => {
      toast({
        title: "Booking Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleBooking = () => {
    if (!selectedOffer) return;

    if (!passengerDetails.firstName || !passengerDetails.lastName || !passengerDetails.email) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required passenger details.",
        variant: "destructive",
      });
      return;
    }

    bookingMutation.mutate({
      offerId: selectedOffer.offerId,
      path: ["DEL", "BOM"], // Mock path - in real app, this would come from search results
      fareBreakdown: selectedOffer.fareBreakdown,
      total: selectedOffer.totalFare,
      fareClass: selectedOffer.class,
      passengerDetails,
    });
  };

  if (!selectedOffer) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">No offer selected</h1>
          <Button onClick={() => setLocation("/search")} data-testid="button-back-to-search">
            Back to Search
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <Button 
          variant="ghost" 
          onClick={() => setLocation("/search")}
          className="mb-4"
          data-testid="button-back"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Search
        </Button>
        <h1 className="text-3xl font-bold text-gray-900" data-testid="text-page-title">
          Confirm Your Booking
        </h1>
        <p className="text-gray-600 mt-2">Delhi (DEL) → Mumbai (BOM) • {new Date().toLocaleDateString()}</p>
      </div>

      {/* Flight Summary */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Flight Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Route</span>
                <span className="font-medium" data-testid="text-route">DEL → BOM</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Distance</span>
                <span className="font-medium">1,138 km</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Algorithm</span>
                <span className="font-medium">Dijkstra (Shortest Path)</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Fare Class</span>
                <span className="font-medium" data-testid="text-fare-class">{selectedOffer.class}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Flight Time</span>
                <span className="font-medium">2h 15m</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Passengers</span>
                <span className="font-medium">1 Adult</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Passenger Details */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Passenger Details</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={passengerDetails.firstName}
                  onChange={(e) => setPassengerDetails(prev => ({ ...prev, firstName: e.target.value }))}
                  placeholder="John"
                  data-testid="input-first-name"
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={passengerDetails.lastName}
                  onChange={(e) => setPassengerDetails(prev => ({ ...prev, lastName: e.target.value }))}
                  placeholder="Doe"
                  data-testid="input-last-name"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={passengerDetails.email}
                  onChange={(e) => setPassengerDetails(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="john.doe@example.com"
                  data-testid="input-email"
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={passengerDetails.phone}
                  onChange={(e) => setPassengerDetails(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+91 98765 43210"
                  data-testid="input-phone"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Price Summary */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Price Breakdown</h2>
          <PriceBreakdown 
            fareBreakdown={selectedOffer.fareBreakdown}
            totalFare={selectedOffer.totalFare}
            showDemand={true}
          />
        </CardContent>
      </Card>

      {/* Booking Actions */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Button 
          variant="outline"
          onClick={() => setLocation("/search")}
          className="flex-1"
          data-testid="button-back-to-search"
        >
          Back to Search
        </Button>
        <Button 
          onClick={handleBooking}
          disabled={bookingMutation.isPending}
          className="flex-1"
          data-testid="button-confirm-booking"
        >
          {bookingMutation.isPending ? "Processing..." : "Confirm Booking"}
        </Button>
      </div>
    </div>
  );
}
