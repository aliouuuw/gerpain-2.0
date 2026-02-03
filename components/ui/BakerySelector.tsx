"use client";

import * as React from "react";
import { Building2 } from "lucide-react";
import { Select, type SelectOption } from "@/components/ui/select";
import { useBakeries } from "@/lib/hooks/useBakeries";

export type Bakery = {
  id: string;
  name: string;
  code: string;
  address?: string;
};

type BakerySelectorProps = {
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
};

const BAKERY_STORAGE_KEY = "selectedBakeryId";

export function getStoredBakeryId(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem(BAKERY_STORAGE_KEY);
  }
  return null;
}

export function setStoredBakeryId(bakeryId: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem(BAKERY_STORAGE_KEY, bakeryId);
  }
}

export function BakerySelector({ value, onValueChange, className }: BakerySelectorProps) {
  const { data: bakeries, isLoading, error } = useBakeries();
  
  // Initialize from localStorage or first bakery
  const [selectedId, setSelectedId] = React.useState<string>(() => {
    if (value) return value;
    const stored = getStoredBakeryId();
    return stored || "";
  });

  // Update selectedId when bakeries load
  React.useEffect(() => {
    if (bakeries && bakeries.length > 0) {
      const currentStored = getStoredBakeryId();
      // If no selection yet, use first bakery or stored value
      if (!selectedId || !bakeries.find(b => b.id === selectedId)) {
        const newId = currentStored && bakeries.find(b => b.id === currentStored) 
          ? currentStored 
          : bakeries[0].id;
        setSelectedId(newId);
        setStoredBakeryId(newId);
        onValueChange?.(newId);
      }
    }
  }, [bakeries, selectedId, onValueChange]);
  
  const handleChange = (newValue: string) => {
    setSelectedId(newValue);
    setStoredBakeryId(newValue);
    onValueChange?.(newValue);
  };

  const options: SelectOption[] = bakeries?.map((bakery) => ({
    value: bakery.id,
    label: `${bakery.name} (${bakery.code})`,
    icon: (
      <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-[var(--secondary)] text-[var(--muted-foreground)]">
        <Building2 className="size-3.5" />
      </div>
    ),
  })) || [];

  if (isLoading) {
    return (
      <div className={className}>
        <div className="flex w-full items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--secondary)]/50 px-3 py-2 text-sm text-[var(--muted-foreground)]">
          Chargement...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={className}>
        <div className="flex w-full items-center gap-2 rounded-lg border border-[var(--error)] bg-[var(--error-subtle)] px-3 py-2 text-sm text-[var(--error)]">
          Erreur de chargement
        </div>
      </div>
    );
  }

  if (!bakeries || bakeries.length === 0) {
    return (
      <div className={className}>
        <div className="flex w-full items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--secondary)]/50 px-3 py-2 text-sm text-[var(--muted-foreground)]">
          Aucune boulangerie
        </div>
      </div>
    );
  }

  return (
    <Select
      value={selectedId}
      onValueChange={(val) => handleChange(Array.isArray(val) ? val[0] : val)}
      placeholder="Sélectionner une boulangerie"
      options={options}
      className={className}
    />
  );
}
