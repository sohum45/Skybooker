import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Airport } from "@/types";
import { Search } from "lucide-react";

interface AirportSearchProps {
  label: string;
  value: string;
  onChange: (code: string) => void;
  placeholder?: string;
}

export default function AirportSearch({
  label,
  value,
  onChange,
  placeholder,
}: AirportSearchProps) {
  const [query, setQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const { data: airports = [] } = useQuery<Airport[]>({
    queryKey: ["/api/airports"],
  });

  const filteredAirports = airports.filter(
    (airport) =>
      airport.code.toLowerCase().includes(query.toLowerCase()) ||
      airport.name.toLowerCase().includes(query.toLowerCase()) ||
      airport.city.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 5);

  useEffect(() => {
    const airport = airports.find(a => a.code === value);
    if (airport) {
      setQuery(`${airport.code} - ${airport.city}`);
    }
  }, [value, airports]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    setShowSuggestions(true);
  };

  const handleSelectAirport = (airport: Airport) => {
    setQuery(`${airport.code} - ${airport.city}`);
    onChange(airport.code);
    setShowSuggestions(false);
  };

  return (
    <div className="relative">
      <Label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </Label>
      <div className="relative">
        <Input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          placeholder={placeholder}
          className="pr-10"
          data-testid={`input-${label.toLowerCase().replace(/\s+/g, '-')}`}
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
          <Search className="w-5 h-5 text-gray-400" />
        </div>
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && filteredAirports.length > 0 && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg">
          {filteredAirports.map((airport) => (
            <button
              key={airport.code}
              onClick={() => handleSelectAirport(airport)}
              className="w-full p-3 text-left hover:bg-gray-50 border-b last:border-b-0 transition-colors"
              data-testid={`suggestion-${airport.code}`}
            >
              <div className="font-medium">
                {airport.code} - {airport.name}
              </div>
              <div className="text-sm text-gray-600">{airport.city}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
