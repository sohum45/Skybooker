import { useEffect } from "react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plane, MapPin, Calendar, Clock } from "lucide-react";
import { socketService } from "@/lib/socket";

export default function Home() {
  const { user } = useAuth();

  useEffect(() => {
    // Connect to WebSocket for real-time updates
    socketService.connect();

    return () => {
      socketService.disconnect();
    };
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-br from-primary-800 via-primary-600 to-sky-500 rounded-3xl p-8 mb-8 text-white">
        <div className="max-w-4xl">
          <h1 className="text-4xl md:text-5xl font-bold mb-4" data-testid="text-welcome">
            Welcome back, {user?.name}!
          </h1>
          <p className="text-xl text-blue-100 mb-8">
            Ready to explore new destinations? Let's find your next flight.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/search">
              <Button size="lg" className="bg-white text-primary-600 hover:bg-gray-100" data-testid="button-search-flights">
                <Plane className="w-5 h-5 mr-2" />
                Search Flights
              </Button>
            </Link>
            <Link href="/bookings">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-primary-600" data-testid="button-my-bookings">
                <Calendar className="w-5 h-5 mr-2" />
                My Bookings
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <Link href="/search">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                  <Plane className="w-6 h-6 text-primary-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">New Search</h3>
                  <p className="text-sm text-gray-600">Find flights with our smart algorithms</p>
                </div>
              </div>
            </CardContent>
          </Link>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <Link href="/bookings">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">My Trips</h3>
                  <p className="text-sm text-gray-600">View and manage your bookings</p>
                </div>
              </div>
            </CardContent>
          </Link>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <MapPin className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Route Explorer</h3>
                <p className="text-sm text-gray-600">Discover new destinations</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Features Highlight */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Experience the Future of Flight Booking
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <Clock className="w-4 h-4 text-primary-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Real-time Updates</h3>
                <p className="text-gray-600">Get instant notifications about price changes and booking confirmations</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <MapPin className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Interactive Maps</h3>
                <p className="text-gray-600">Visualize your route with detailed airport information and flight paths</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <Plane className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Smart Routing</h3>
                <p className="text-gray-600">Choose between Dijkstra and A* algorithms for optimal route planning</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <Calendar className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Flexible Booking</h3>
                <p className="text-gray-600">Multiple fare classes to suit your travel needs and budget</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
