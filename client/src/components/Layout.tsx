import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout, isAuthenticated } = useAuth();
  const [location] = useLocation();

  const navigation = [
    { name: "Search Flights", href: "/search" },
    { name: "My Bookings", href: "/bookings" },
    ...(user?.role === "admin" ? [{ name: "Admin", href: "/admin" }] : []),
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <nav className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">AC</span>
                </div>
                <span className="text-xl font-bold text-gray-900">AirConnect</span>
              </Link>
            </div>
            
            {isAuthenticated && (
              <div className="hidden md:flex items-center space-x-8">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`px-3 py-2 font-medium transition-colors ${
                      location === item.href
                        ? "text-primary-600"
                        : "text-gray-700 hover:text-primary-600"
                    }`}
                  >
                    {item.name}
                  </Link>
                ))}
              </div>
            )}

            <div className="flex items-center space-x-4">
              {isAuthenticated && (
                <div className="hidden md:flex items-center space-x-2 text-sm text-gray-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>Live Updates Active</span>
                </div>
              )}
              
              {isAuthenticated ? (
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-600">Welcome, {user?.name}</span>
                  <Button onClick={logout} variant="outline">
                    Sign Out
                  </Button>
                </div>
              ) : (
                <Link href="/login">
                  <Button>Sign In</Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main>{children}</main>
    </div>
  );
}
