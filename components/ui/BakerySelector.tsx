"use client";

import * as React from "react";
import { Building2, Plus, ChevronDown, Check } from "lucide-react";
import Link from "next/link";
import { Combobox, ComboboxButton, ComboboxInput, ComboboxOption, ComboboxOptions } from "@headlessui/react";
import { cx, focusRing } from "@/lib/utils";
import { useBakeries, useBakeryTierStatus } from "@/lib/hooks/useBakeries";

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
  const { data: tierStatus } = useBakeryTierStatus();
  
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
  
  const handleChange = (newValue: string | null) => {
    if (!newValue) return;
    setSelectedId(newValue);
    setStoredBakeryId(newValue);
    onValueChange?.(newValue);
  };

  const selectedBakery = bakeries?.find(b => b.id === selectedId);
  const canCreate = tierStatus ? tierStatus.current < tierStatus.limit : false;

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
        <Link
          href="/settings/bakeries"
          className="flex w-full items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--primary)] px-3 py-2 text-sm text-white hover:bg-[var(--primary)]/90"
        >
          <Plus className="size-4" />
          Créer une boulangerie
        </Link>
      </div>
    );
  }

  return (
    <div className={className}>
      <Combobox value={selectedId || ""} onChange={handleChange}>
        <div className="relative">
          <ComboboxButton
            className={cx(
              "flex min-h-[2.5rem] w-full items-center gap-2 rounded-lg",
              "border border-[var(--border)] bg-[var(--card)] px-3 py-2",
              "text-sm text-[var(--foreground)]",
              "transition-all",
              focusRing
            )}
          >
            <Building2 className="size-4 text-[var(--muted-foreground)]" />
            <span className="flex-1 truncate text-left">
              {selectedBakery ? `${selectedBakery.name} (${selectedBakery.code})` : "Sélectionner une boulangerie"}
            </span>
            <ChevronDown className="size-4 text-[var(--muted-foreground)]" />
          </ComboboxButton>

          <ComboboxOptions
            className={cx(
              "absolute z-50 mt-2 max-h-80 w-full overflow-auto rounded-lg",
              "border border-[var(--border)] bg-[var(--card)] shadow-lg",
              "focus:outline-none"
            )}
          >
            <div className="py-1">
              {bakeries.map((bakery) => (
                <ComboboxOption
                  key={bakery.id}
                  value={bakery.id}
                  className={({ active }) =>
                    cx(
                      "flex cursor-pointer items-center gap-2 px-3 py-2 text-sm",
                      active && "bg-[var(--secondary)]"
                    )
                  }
                >
                  {({ selected }) => (
                    <>
                      <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-[var(--secondary)] text-[var(--muted-foreground)]">
                        <Building2 className="size-3.5" />
                      </div>
                      <span className="flex-1 truncate">{bakery.name} ({bakery.code})</span>
                      {selected && <Check className="size-4 text-[var(--primary)]" />}
                    </>
                  )}
                </ComboboxOption>
              ))}
            </div>
            
            {canCreate && (
              <>
                <div className="border-t border-[var(--border)]" />
                <Link
                  href="/settings/bakeries"
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-2 px-3 py-2.5 text-sm text-[var(--primary)] hover:bg-[var(--secondary)]"
                >
                  <Plus className="size-4" />
                  <span>Nouvelle boulangerie</span>
                </Link>
              </>
            )}
          </ComboboxOptions>
        </div>
      </Combobox>
    </div>
  );
}
