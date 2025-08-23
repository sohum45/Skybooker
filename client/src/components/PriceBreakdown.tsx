import { FareBreakdown } from "@/types";

interface PriceBreakdownProps {
  fareBreakdown: FareBreakdown;
  totalFare: number;
  showDemand?: boolean;
}

export default function PriceBreakdown({ 
  fareBreakdown, 
  totalFare, 
  showDemand = false 
}: PriceBreakdownProps) {
  return (
    <div className="space-y-2 text-sm border-t pt-4" data-testid="price-breakdown">
      <div className="flex justify-between">
        <span className="text-gray-600">Base fare</span>
        <span data-testid="text-base-fare">₹{fareBreakdown.base.toLocaleString()}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-600">Fuel charges</span>
        <span data-testid="text-fuel-charges">₹{Math.round(fareBreakdown.fuelCost).toLocaleString()}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-600">Operations fee</span>
        <span data-testid="text-ops-fee">₹{Math.round(fareBreakdown.ops).toLocaleString()}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-600">Taxes</span>
        <span data-testid="text-taxes">₹{Math.round(fareBreakdown.taxes).toLocaleString()}</span>
      </div>
      {showDemand && (
        <div className="flex justify-between">
          <span className="text-gray-600">Demand factor</span>
          <span data-testid="text-demand-factor">{fareBreakdown.demand.toFixed(2)}x</span>
        </div>
      )}
      <div className="flex justify-between font-semibold pt-2 border-t">
        <span>Total</span>
        <span data-testid="text-total-fare">₹{totalFare.toLocaleString()}</span>
      </div>
    </div>
  );
}
