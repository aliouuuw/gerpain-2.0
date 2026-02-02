"use client";

import * as React from "react";
import * as Select from "@radix-ui/react-select";
import { Check, ChevronDown, MapPin, Building2, Warehouse } from "lucide-react";
import { cx, focusRing } from "@/lib/utils";

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

  const selectedLocation = mockLocations.find((loc) => loc.id === selectedId);
  const SelectedIcon = selectedLocation ? locationIcons[selectedLocation.type] : Building2;

  return (
    <Select.Root value={selectedId} onValueChange={handleChange}>
      <Select.Trigger
        className={cx(
          "group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-all duration-200",
          "bg-[var(--secondary)]/50 border border-[var(--border)]/50",
          "hover:bg-[var(--secondary)] hover:border-[var(--border)]",
          "data-[state=open]:bg-[var(--secondary)] data-[state=open]:border-[var(--border)]",
          focusRing,
          className
        )}
      >
        <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-[var(--primary)]/10 text-[var(--primary)]">
          <SelectedIcon className="size-4" />
        </div>
        <div className="flex-1 min-w-0">
          <Select.Value asChild>
            <div>
              <p className="text-sm font-medium text-[var(--foreground)] truncate">
                {selectedLocation?.name}
              </p>
            </div>
          </Select.Value>
        </div>
        <Select.Icon asChild>
          <ChevronDown className="size-4 text-[var(--muted-foreground)] transition-transform duration-200 group-data-[state=open]:rotate-180" />
        </Select.Icon>
      </Select.Trigger>

      <Select.Portal>
        <Select.Content
          className={cx(
            "z-50 min-w-[220px] overflow-hidden rounded-xl",
            "bg-[var(--card)] border border-[var(--border)]",
            "shadow-lg",
            "animate-in fade-in-0 zoom-in-95 data-[side=bottom]:slide-in-from-top-2",
          )}
          position="popper"
          sideOffset={6}
          align="start"
        >
          <Select.Viewport className="p-1">
            <div className="px-2 py-1.5 mb-0.5">
              <p className="text-[11px] font-medium text-[var(--muted-foreground)] uppercase tracking-wider">
                Local
              </p>
            </div>
            {mockLocations.map((location) => {
              const Icon = locationIcons[location.type];
              return (
                <Select.Item
                  key={location.id}
                  value={location.id}
                  className={cx(
                    "relative flex items-center gap-2.5 rounded-lg px-2 py-2 cursor-pointer transition-colors",
                    "text-[var(--foreground)]",
                    "hover:bg-[var(--secondary)]",
                    "focus:outline-none focus:bg-[var(--secondary)]",
                    "data-[state=checked]:bg-[var(--primary)]/10 data-[state=checked]:text-[var(--primary)]",
                  )}
                >
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-[var(--secondary)] text-[var(--muted-foreground)] data-[state=checked]:bg-[var(--primary)]/10 data-[state=checked]:text-[var(--primary)]">
                    <Icon className="size-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <Select.ItemText asChild>
                      <p className="text-sm font-medium truncate">{location.name}</p>
                    </Select.ItemText>
                    <p className="text-xs text-[var(--muted-foreground)] truncate">
                      {location.address}
                    </p>
                  </div>
                  <Select.ItemIndicator>
                    <Check className="size-4 text-[var(--primary)]" />
                  </Select.ItemIndicator>
                </Select.Item>
              );
            })}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
