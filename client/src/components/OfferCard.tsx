import { Offer } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import PriceBreakdown from "@/components/PriceBreakdown";
import { DollarSign, Star, Shield } from "lucide-react";

interface OfferCardProps {
  offer: Offer;
  onSelect: (offer: Offer) => void;
}

const classIcons = {
  Saver: DollarSign,
  Standard: Star,
  Flex: Shield,
};

const classColors = {
  Saver: "orange",
  Standard: "blue",
  Flex: "purple",
};

export default function OfferCard({ offer, onSelect }: OfferCardProps) {
  const Icon = classIcons[offer.class];
  const color = classColors[offer.class];

  return (
    <Card className="hover:shadow-lg transition-shadow duration-300" data-testid={`offer-card-${offer.class.toLowerCase()}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 bg-${color}-100 rounded-full flex items-center justify-center`}>
              <Icon className={`w-5 h-5 text-${color}-600`} />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900" data-testid={`text-class-${offer.class.toLowerCase()}`}>
                {offer.class}
              </h4>
              <p className="text-sm text-gray-600">
                {offer.class === "Saver" && "Basic fare"}
                {offer.class === "Standard" && "Popular choice"}
                {offer.class === "Flex" && "Full flexibility"}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900" data-testid={`text-price-${offer.class.toLowerCase()}`}>
              ₹{offer.totalFare.toLocaleString()}
            </div>
            <div className="text-sm text-gray-500">per person</div>
          </div>
        </div>

        <PriceBreakdown fareBreakdown={offer.fareBreakdown} totalFare={offer.totalFare} />

        <Button
          onClick={() => onSelect(offer)}
          className="w-full mt-4"
          data-testid={`button-select-${offer.class.toLowerCase()}`}
        >
          Select Flight
        </Button>
      </CardContent>
    </Card>
  );
}
