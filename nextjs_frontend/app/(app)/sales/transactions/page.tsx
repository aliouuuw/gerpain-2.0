"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/Card";
import { queryKeys } from "@/lib/query-keys";

type Product = {
  id: string;
  name: string;
  unit: string;
  price: number;
  isFrequent?: boolean;
};

const mockProducts: Product[] = [
  {
    id: "pain-kilo",
    name: "Pain kilo",
    unit: "pièce",
    price: 1500,
    isFrequent: true,
  },
  {
    id: "baguette-classique",
    name: "Baguette classique",
    unit: "pièce",
    price: 300,
    isFrequent: true,
  },
  {
    id: "croissant-beurre",
    name: "Croissant au beurre",
    unit: "pièce",
    price: 600,
    isFrequent: true,
  },
  {
    id: "pain-complet",
    name: "Pain complet",
    unit: "pièce",
    price: 1800,
  },
  {
    id: "boisson-soft",
    name: "Boisson soft",
    unit: "bouteille",
    price: 800,
  },
];

async function fetchSalesProducts(): Promise<Product[]> {
  // Simule un appel API avec un léger délai
  await new Promise((resolve) => setTimeout(resolve, 300));
  return mockProducts;
}

const PAYMENT_MODES = ["Espèces", "Carte", "Mobile Money"] as const;

type PaymentMode = (typeof PAYMENT_MODES)[number];

function formatCurrency(value: number) {
  return value.toLocaleString("fr-FR", {
    style: "currency",
    currency: "XOF",
    maximumFractionDigits: 0,
  });
}

export default function SalesTransactionsPage() {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("Espèces");

  const today = new Date().toISOString().slice(0, 10);

  const {
    data: products = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: queryKeys.sales.transactions({ date: today }),
    queryFn: fetchSalesProducts,
  });

  const lineItems = products
    .map((product) => {
      const quantity = quantities[product.id] ?? 0;
      const subtotal = quantity * product.price;
      return { product, quantity, subtotal };
    })
    .filter((item) => item.quantity > 0);

  const total = lineItems.reduce((sum, item) => sum + item.subtotal, 0);

  function handleAdjustQuantity(productId: string, delta: number) {
    setQuantities((prev) => {
      const current = prev[productId] ?? 0;
      const next = Math.max(0, current + delta);

      if (next === 0) {
        const { [productId]: _, ...rest } = prev;
        return rest;
      }

      return { ...prev, [productId]: next };
    });
  }

  return (
    <div className="space-y-8">
      <div className="stagger-item">
        <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)]">
          Saisie des ventes en caisse
        </h1>
        <p className="mt-2 text-[var(--muted-foreground)]">
          Enregistrez rapidement les ventes directes en magasin avec une vue
          optimisée pour la caisse.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card className="stagger-item">
          <CardHeader>
            <CardTitle>Produits fréquents</CardTitle>
            <CardDescription>
              Sélectionnez les produits vendus et ajustez les quantités.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-[var(--muted-foreground)]">
                Chargement des produits…
              </p>
            ) : isError ? (
              <p className="text-sm text-red-600">
                Impossible de charger la liste des produits. Réessayez plus
                tard.
              </p>
            ) : products.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)]">
                Aucun produit configuré pour le moment.
              </p>
            ) : (
              <div className="space-y-3">
                {products.map((product) => {
                  const quantity = quantities[product.id] ?? 0;
                  return (
                    <div
                      key={product.id}
                      className="flex items-center justify-between rounded-md border border-[var(--border-subtle)] bg-[var(--surface)] px-4 py-3"
                    >
                      <div>
                        <p className="font-medium text-[var(--foreground)]">
                          {product.name}
                        </p>
                        <p className="text-xs text-[var(--muted-foreground)]">
                          {product.unit} · {formatCurrency(product.price)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          className="h-8 w-8 rounded-full p-0"
                          onClick={() => handleAdjustQuantity(product.id, -1)}
                        >
                          -
                        </Button>
                        <span className="min-w-[2ch] text-center text-sm font-medium">
                          {quantity}
                        </span>
                        <Button
                          type="button"
                          variant="primary"
                          className="h-8 w-8 rounded-full p-0"
                          onClick={() => handleAdjustQuantity(product.id, 1)}
                        >
                          +
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="stagger-item lg:row-span-2 lg:self-start">
          <CardHeader>
            <CardTitle>Récapitulatif de la vente</CardTitle>
            <CardDescription>
              Vérifiez les lignes de vente et choisissez le mode de paiement.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
                Lignes de vente
              </p>
              {lineItems.length === 0 ? (
                <p className="text-sm text-[var(--muted-foreground)]">
                  Ajoutez des produits à gauche pour commencer la saisie.
                </p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {lineItems.map(({ product, quantity, subtotal }) => (
                    <li
                      key={product.id}
                      className="flex items-center justify-between"
                    >
                      <span>
                        {product.name}{" "}
                        <span className="text-xs text-[var(--muted-foreground)]">
                          × {quantity}
                        </span>
                      </span>
                      <span className="font-medium">
                        {formatCurrency(subtotal)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
                Mode de paiement
              </p>
              <div className="flex flex-wrap gap-2">
                {PAYMENT_MODES.map((mode) => {
                  const isActive = paymentMode === mode;
                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setPaymentMode(mode)}
                      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs ${
                        isActive
                          ? "border-[var(--primary)] bg-[var(--primary-subtle)] text-[var(--primary)]"
                          : "border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] hover:bg-[var(--surface)]"
                      }`}
                    >
                      {mode}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-[var(--border-subtle)] pt-4">
              <span className="text-sm font-medium text-[var(--foreground)]">Total</span>
              <span className="text-lg font-semibold text-[var(--foreground)]">
                {formatCurrency(total)}
              </span>
            </div>

            <Button type="button" className="w-full" disabled={lineItems.length === 0}>
              Enregistrer la vente (brouillon)
            </Button>

            <p className="text-xs text-[var(--muted-foreground)]">
              Pour l&apos;instant, cette page enregistre la vente uniquement côté
              interface. Le lien avec l&apos;API &quot;/sales/transactions&quot; sera ajouté
              plus tard.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
