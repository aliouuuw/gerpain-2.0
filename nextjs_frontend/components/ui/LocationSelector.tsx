"use client";

import * as React from "react";
import { MapPin, Building2, Warehouse } from "lucide-react";
import { Select, type SelectOption } from "@/components/ui/select";

type Location = {
  id: string;
  name: string;
  type: "bakery" | "shop" | "warehouse";
  address?: string;
};

const mockLocations: Location[] = [
  { id: "loc-1", name: "12 Rue Principale", type: "bakery", address: "Boulangerie Centre" },
  { id: "loc-2", name: "Place du Marché", type: "shop", address: "Point de vente" },
  { id: "loc-3", name: "Zone Industrielle", type: "warehouse", address: "Dépôt" },
];

const locationIcons = {
  bakery: Building2,
  shop: MapPin,
  warehouse: Warehouse,
};

type LocationSelectorProps = {
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
};

export function LocationSelector({ value, onValueChange, className }: LocationSelectorProps) {
  const [selectedId, setSelectedId] = React.useState(value || mockLocations[0].id);
  
  const handleChange = (newValue: string) => {
    setSelectedId(newValue);
    onValueChange?.(newValue);
  };

  const options: SelectOption[] = mockLocations.map((location) => ({
    value: location.id,
    label: location.name,
    icon: locationIcons[location.type] ? (
      <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-[var(--secondary)] text-[var(--muted-foreground)]">
        {React.createElement(locationIcons[location.type], { className: "size-3.5" })}
      </div>
    ) : undefined,
  }));

  return (
    <Select
      value={selectedId}
      onValueChange={(val) => handleChange(Array.isArray(val) ? val[0] : val)}
      placeholder="Sélectionner une localisation"
      options={options}
      className={className}
    />
  );
}
