"use client";

import React, { useState } from "react";

import { Button } from "@/components/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/Card";
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

const SELLING_PERIODS = ["Matin", "Après-midi", "Soir"] as const;

type SellingPeriod = (typeof SELLING_PERIODS)[number];

type DeliveryEmployee = {
  id: string;
  name: string;
  routeLabel: string;
};

type DeliveryProduct = {
  id: string;
  name: string;
  unit: string;
  unitPrice: number;
};

type DeliveryStatus = "draft" | "in_progress" | "validated";

type DeliveryItem = {
  id: string;
  productId: string;
  quantityOut: number;
  quantityReturned: number;
  unitPrice: number;
  sellingPeriod?: SellingPeriod;
};

type DeliveryRun = {
  id: string;
  employeeId: string;
  date: string;
  locationName: string;
  status: DeliveryStatus;
  notes: string;
  items: DeliveryItem[];
};

type RunAggregates = {
  quantityEntrusted: number;
  totalEntrusted: number;
  quantityReturned: number;
  quantitySold: number;
  revenue: number;
  returnRate: number;
};

const mockEmployees: DeliveryEmployee[] = [
  {
    id: "ali",
    name: "Ali – Tournée centre-ville",
    routeLabel: "Centre-ville",
  },
  {
    id: "amina",
    name: "Amina – Tournée bureaux",
    routeLabel: "Bureaux & administrations",
  },
  {
    id: "moussa",
    name: "Moussa – Tournée quartiers résidentiels",
    routeLabel: "Résidentiel",
  },
];

const mockProducts: DeliveryProduct[] = [
  {
    id: "baguette-500g",
    name: "Baguette 500g",
    unit: "pièce",
    unitPrice: 250,
  },
  {
    id: "baguette-750g",
    name: "Baguette 750g",
    unit: "pièce",
    unitPrice: 350,
  },
  {
    id: "pain-kilo",
    name: "Pain kilo",
    unit: "pièce",
    unitPrice: 1500,
  },
  {
    id: "croissant",
    name: "Croissant au beurre",
    unit: "pièce",
    unitPrice: 400,
  },
];

function createInitialRuns(date: string): DeliveryRun[] {
  return mockEmployees.map((employee) => ({
    id: `${employee.id}-${date}`,
    employeeId: employee.id,
    date,
    locationName: "Point de vente actif",
    status: "draft",
    notes: "",
    items: mockProducts.map((product) => ({
      id: `${employee.id}-${product.id}`,
      productId: product.id,
      quantityOut: 0,
      quantityReturned: 0,
      unitPrice: product.unitPrice,
    })),
  }));
}

function createEmptyDeliveryItem(runId: string, productId: string): DeliveryItem {
  const product = mockProducts.find((candidate) => candidate.id === productId);
  return {
    id: `${runId}-${productId}-${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 8)}`,
    productId,
    quantityOut: 0,
    quantityReturned: 0,
    unitPrice: product?.unitPrice ?? 0,
  };
}

function computeRunAggregates(run: DeliveryRun): RunAggregates {
  const quantityEntrusted = run.items.reduce(
    (sum, item) => sum + item.quantityOut,
    0,
  );
  const quantityReturned = run.items.reduce(
    (sum, item) => sum + item.quantityReturned,
    0,
  );
  const quantitySold = quantityEntrusted - quantityReturned;
  const totalEntrusted = run.items.reduce(
    (sum, item) => sum + item.quantityOut * item.unitPrice,
    0,
  );
  const revenue = run.items.reduce(
    (sum, item) =>
      sum + (item.quantityOut - item.quantityReturned) * item.unitPrice,
    0,
  );
  const returnRate = quantityEntrusted > 0 ? quantityReturned / quantityEntrusted : 0;

  return {
    quantityEntrusted,
    totalEntrusted,
    quantityReturned,
    quantitySold,
    revenue,
    returnRate,
  };
}

function formatCurrency(value: number) {
  return value.toLocaleString("fr-FR", {
    style: "currency",
    currency: "XOF",
    maximumFractionDigits: 0,
  });
}

function formatReturnRate(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0 %";
  return `${(value * 100).toFixed(1)} %`;
}

function getStatusLabel(status: DeliveryStatus) {
  switch (status) {
    case "draft":
      return "Brouillon";
    case "in_progress":
      return "En cours";
    case "validated":
      return "Validé";
    default:
      return status;
  }
}

function getStatusClasses(status: DeliveryStatus) {
  switch (status) {
    case "draft":
      return "bg-[var(--secondary)] text-[var(--muted-foreground)]";
    case "in_progress":
      return "bg-[var(--warning-subtle)] text-[var(--warning)]";
    case "validated":
      return "bg-[var(--info-subtle)] text-[var(--info)]";
    default:
      return "bg-[var(--secondary)] text-[var(--muted-foreground)]";
  }
}

export default function DeliveriesBoardPage() {
  const [date, setDate] = useState<string>(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [runs, setRuns] = useState<DeliveryRun[]>(() =>
    createInitialRuns(new Date().toISOString().slice(0, 10)),
  );
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  const selectedRun = runs.find((run) => run.id === selectedRunId) ?? null;

  function handleDateChange(newDate: string) {
    setDate(newDate);
    setRuns(createInitialRuns(newDate));
    setSelectedRunId(null);
  }

  function handleItemQuantityOutChange(
    runId: string,
    itemId: string,
    quantityOut: number,
  ) {
    setRuns((previous) =>
      previous.map((run) => {
        if (run.id !== runId) return run;
        return {
          ...run,
          items: run.items.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  quantityOut: Math.max(0, quantityOut),
                }
              : item,
          ),
        };
      }),
    );
  }

  function handleItemQuantityReturnedChange(
    runId: string,
    itemId: string,
    quantityReturned: number,
  ) {
    setRuns((previous) =>
      previous.map((run) => {
        if (run.id !== runId) return run;
        return {
          ...run,
          items: run.items.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  quantityReturned: Math.max(0, quantityReturned),
                }
              : item,
          ),
        };
      }),
    );
  }

  function handleItemSellingPeriodChange(
    runId: string,
    itemId: string,
    sellingPeriod: SellingPeriod | "",
  ) {
    setRuns((previous) =>
      previous.map((run) => {
        if (run.id !== runId) return run;
        return {
          ...run,
          items: run.items.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  sellingPeriod: sellingPeriod || undefined,
                }
              : item,
          ),
        };
      }),
    );
  }

  function handleAddPeriodLine(runId: string, productId: string) {
    setRuns((previous) =>
      previous.map((run) =>
        run.id === runId
          ? {
              ...run,
              items: [...run.items, createEmptyDeliveryItem(runId, productId)],
            }
          : run,
      ),
    );
  }

  function handleDeleteItem(runId: string, itemId: string) {
    setRuns((previous) =>
      previous.map((run) =>
        run.id === runId
          ? {
              ...run,
              items: run.items.filter((item) => item.id !== itemId),
            }
          : run,
      ),
    );
  }

  function handleClearItem(runId: string, itemId: string) {
    setRuns((previous) =>
      previous.map((run) =>
        run.id === runId
          ? {
              ...run,
              items: run.items.map((item) =>
                item.id === itemId
                  ? {
                      ...item,
                      quantityOut: 0,
                      quantityReturned: 0,
                      sellingPeriod: undefined,
                    }
                  : item,
              ),
            }
          : run,
      ),
    );
  }

  function handleNotesChange(runId: string, notes: string) {
    setRuns((previous) =>
      previous.map((run) =>
        run.id === runId
          ? {
              ...run,
              notes,
            }
          : run,
      ),
    );
  }

  function handleSaveDraft(runId: string) {
    const run = runs.find((current) => current.id === runId);
    // eslint-disable-next-line no-console
    console.log("Save draft delivery run:", run);
    setRuns((previous) =>
      previous.map((current) =>
        current.id === runId
          ? {
              ...current,
              status: "in_progress",
            }
          : current,
      ),
    );
  }

  function handleValidateRun(runId: string) {
    const run = runs.find((current) => current.id === runId);
    // eslint-disable-next-line no-console
    console.log("Validate delivery run:", run);
    setRuns((previous) =>
      previous.map((current) =>
        current.id === runId
          ? {
              ...current,
              status: "validated",
            }
          : current,
      ),
    );
  }

  const overallTotals = runs.reduce(
    (accumulator, run) => {
      const aggregates = computeRunAggregates(run);
      return {
        quantityEntrusted:
          accumulator.quantityEntrusted + aggregates.quantityEntrusted,
        totalEntrusted: accumulator.totalEntrusted + aggregates.totalEntrusted,
        quantityReturned:
          accumulator.quantityReturned + aggregates.quantityReturned,
        quantitySold: accumulator.quantitySold + aggregates.quantitySold,
        revenue: accumulator.revenue + aggregates.revenue,
      };
    },
    {
      quantityEntrusted: 0,
      totalEntrusted: 0,
      quantityReturned: 0,
      quantitySold: 0,
      revenue: 0,
    },
  );

  const overallReturnRate =
    overallTotals.quantityEntrusted > 0
      ? overallTotals.quantityReturned / overallTotals.quantityEntrusted
      : 0;

  const overallDistinctProductsCount = runs.reduce((sum, run) => {
    const distinctProducts = new Set(
      run.items
        .filter((item) => item.quantityOut > 0)
        .map((item) => item.productId),
    );
    return sum + distinctProducts.size;
  }, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">
            Tableau des livraisons
          </h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Gérez les livraisons par livreur · Confiés, retours et encaissements
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label htmlFor="delivery-date" className="text-sm font-medium text-[var(--muted-foreground)]">
              Date
            </label>
            <input
              id="delivery-date"
              type="date"
              value={date}
              onChange={(event) => handleDateChange(event.target.value)}
              className="h-9 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 text-sm text-[var(--foreground)] transition-colors focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
            />
          </div>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle>Vue d&apos;ensemble par livreur</CardTitle>
            <CardDescription>
              Cliquez sur « Détails » pour gérer les quantités par produit
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow variant="header">
                <TableHead>Livreur</TableHead>
                <TableHead numeric>Confié</TableHead>
                <TableHead numeric>Produits</TableHead>
                <TableHead numeric>Retour</TableHead>
                <TableHead numeric>% Ret.</TableHead>
                <TableHead numeric>Vendu</TableHead>
                <TableHead numeric>Montant dû</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead numeric>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
                {runs.map((run) => {
                  const employee = mockEmployees.find(
                    (candidate) => candidate.id === run.employeeId,
                  );
                  const aggregates = computeRunAggregates(run);
                  const distinctProducts = new Set(
                    run.items
                      .filter((item) => item.quantityOut > 0)
                      .map((item) => item.productId),
                  );

                  return (
                    <TableRow key={run.id}>
                      <TableCell>
                        <div className="space-y-0.5">
                          <p className="font-medium">
                            {employee?.name ?? "Livreur"}
                          </p>
                          <p className="text-xs text-[var(--muted-foreground)]">
                            {employee?.routeLabel ?? "Tournée"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell numeric className="font-medium">
                        {aggregates.quantityEntrusted}
                      </TableCell>
                      <TableCell numeric className="text-[var(--muted-foreground)]">
                        {distinctProducts.size}
                      </TableCell>
                      <TableCell numeric className="font-medium">
                        {aggregates.quantityReturned}
                      </TableCell>
                      <TableCell numeric>
                        <span className={aggregates.returnRate > 0.1 ? "font-medium text-[var(--error)]" : "text-[var(--muted-foreground)]"}>
                          {formatReturnRate(aggregates.returnRate)}
                        </span>
                      </TableCell>
                      <TableCell numeric className="font-medium">
                        {aggregates.quantitySold}
                      </TableCell>
                      <TableCell numeric className="font-semibold">
                        {formatCurrency(aggregates.revenue)}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClasses(run.status)}`}>
                          <span className="size-1.5 rounded-full bg-current" />
                          {getStatusLabel(run.status)}
                        </span>
                      </TableCell>
                      <TableCell numeric>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => setSelectedRunId(run.id)}
                        >
                          Détails
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
            <TableFooter>
              <TableRow variant="muted">
                <TableCell className="font-semibold">
                  Total journée
                </TableCell>
                <TableCell numeric className="font-semibold">
                  {overallTotals.quantityEntrusted}
                </TableCell>
                <TableCell numeric className="text-[var(--muted-foreground)]">
                  {overallDistinctProductsCount}
                </TableCell>
                <TableCell numeric className="font-semibold">
                  {overallTotals.quantityReturned}
                </TableCell>
                <TableCell numeric className="text-[var(--muted-foreground)]">
                  {formatReturnRate(overallReturnRate)}
                </TableCell>
                <TableCell numeric className="font-semibold">
                  {overallTotals.quantitySold}
                </TableCell>
                <TableCell numeric className="font-bold">
                  {formatCurrency(overallTotals.revenue)}
                </TableCell>
                <TableCell colSpan={2}>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    Toutes tournées confondues
                  </p>
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle>Détail par produit</CardTitle>
            <CardDescription>
              {selectedRun ? "Saisissez les quantités confiées et retournées" : "Sélectionnez un livreur ci-dessus"}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {selectedRun ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg bg-[var(--secondary)]/50 p-4">
                <div className="space-y-1">
                  <p className="font-medium text-[var(--foreground)]">
                    {mockEmployees.find((e) => e.id === selectedRun.employeeId)?.name}
                  </p>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    {mockEmployees.find((e) => e.id === selectedRun.employeeId)?.routeLabel} · {selectedRun.date}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClasses(selectedRun.status)}`}>
                    <span className="size-1.5 rounded-full bg-current" />
                    {getStatusLabel(selectedRun.status)}
                  </span>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedRunId(null)}>
                    Fermer
                  </Button>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow variant="header">
                    <TableHead>Produit</TableHead>
                    <TableHead numeric>Prix</TableHead>
                    <TableHead numeric>Confié</TableHead>
                    <TableHead numeric>Retour</TableHead>
                    <TableHead numeric>% Ret.</TableHead>
                    <TableHead numeric>Vendu</TableHead>
                    <TableHead numeric>Total</TableHead>
                    <TableHead numeric>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                    {mockProducts.map((product) => {
                      const productItems = selectedRun.items.filter(
                        (item) => item.productId === product.id,
                      );

                      if (productItems.length === 0) {
                        return null;
                      }

                      const productEntrusted = productItems.reduce(
                        (sum, item) => sum + item.quantityOut,
                        0,
                      );
                      const productReturned = productItems.reduce(
                        (sum, item) => sum + item.quantityReturned,
                        0,
                      );
                      const productSold = productEntrusted - productReturned;
                      const productTotal = productItems.reduce(
                        (sum, item) =>
                          sum +
                          (item.quantityOut - item.quantityReturned) *
                            item.unitPrice,
                        0,
                      );
                      const productReturnRate =
                        productEntrusted > 0
                          ? productReturned / productEntrusted
                          : 0;

                      return (
                        <React.Fragment key={product.id}>
                          <TableRow className="bg-[var(--surface)]">
                            <TableCell>
                              <div className="space-y-0.5">
                                <p className="font-semibold">
                                  {product.name}
                                </p>
                                <p className="text-xs text-[var(--muted-foreground)]">
                                  {product.unit}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell numeric className="font-semibold">
                              {formatCurrency(product.unitPrice)}
                            </TableCell>
                            <TableCell numeric className="font-semibold">
                              {productEntrusted}
                            </TableCell>
                            <TableCell numeric className="font-semibold">
                              {productReturned}
                            </TableCell>
                            <TableCell numeric className="font-semibold">
                              {formatReturnRate(productReturnRate)}
                            </TableCell>
                            <TableCell numeric className="font-semibold">
                              {productSold}
                            </TableCell>
                            <TableCell numeric className="font-semibold">
                              {formatCurrency(productTotal)}
                            </TableCell>
                            <TableCell numeric>
                              <div className="flex justify-end">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  className="h-8 px-2 text-xs"
                                  onClick={() =>
                                    handleAddPeriodLine(selectedRun.id, product.id)
                                  }
                                >
                                  + Période
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>

                          {productItems.map((item) => {
                            const soldQuantity =
                              item.quantityOut - item.quantityReturned;
                            const canDelete = productItems.length > 1;
                            const lineReturnRate =
                              item.quantityOut > 0
                                ? item.quantityReturned / item.quantityOut
                                : 0;

                            return (
                              <TableRow key={item.id}>
                                <TableCell>
                                  <select
                                    value={item.sellingPeriod ?? ""}
                                    onChange={(event) =>
                                      handleItemSellingPeriodChange(
                                        selectedRun.id,
                                        item.id,
                                        event.target.value as SellingPeriod | "",
                                      )
                                    }
                                    className="h-8 w-full rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--card)] px-2 text-xs text-[var(--foreground)] shadow-[var(--shadow-sm)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                                  >
                                    <option value="">Non précisé</option>
                                    {SELLING_PERIODS.map((period) => (
                                      <option key={period} value={period}>
                                        {period}
                                      </option>
                                    ))}
                                  </select>
                                </TableCell>
                                <TableCell numeric className="text-[var(--muted-foreground)]">⇓</TableCell>
                                <TableCell numeric>
                                  <input
                                    type="number"
                                    min={0}
                                    value={item.quantityOut || ""}
                                    onChange={(event) =>
                                      handleItemQuantityOutChange(
                                        selectedRun.id,
                                        item.id,
                                        Number(event.target.value || 0),
                                      )
                                    }
                                    className="h-8 w-20 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--card)] px-2 text-right text-xs text-[var(--foreground)] shadow-[var(--shadow-sm)] tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                                  />
                                </TableCell>
                                <TableCell numeric>
                                  <input
                                    type="number"
                                    min={0}
                                    value={item.quantityReturned || ""}
                                    onChange={(event) =>
                                      handleItemQuantityReturnedChange(
                                        selectedRun.id,
                                        item.id,
                                        Number(event.target.value || 0),
                                      )
                                    }
                                    className="h-8 w-20 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--card)] px-2 text-right text-xs text-[var(--foreground)] shadow-[var(--shadow-sm)] tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                                  />
                                </TableCell>
                                <TableCell numeric>
                                  {formatReturnRate(lineReturnRate)}
                                </TableCell>
                                <TableCell numeric className="font-medium">
                                  {soldQuantity}
                                </TableCell>
                                <TableCell numeric className="font-medium">
                                  {formatCurrency(soldQuantity * item.unitPrice)}
                                </TableCell>
                                <TableCell numeric>
                                  <div className="flex justify-end gap-2">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      className="h-8 px-2 text-xs"
                                      onClick={() =>
                                        handleClearItem(selectedRun.id, item.id)
                                      }
                                    >
                                      Réinitialiser
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      className="h-8 px-2 text-xs text-[var(--error)] hover:text-[var(--error)]/90 disabled:text-[var(--muted-foreground)]"
                                      disabled={!canDelete}
                                      onClick={() =>
                                        handleDeleteItem(selectedRun.id, item.id)
                                      }
                                    >
                                      Supprimer
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </React.Fragment>
                      );
                    })}
                </TableBody>
              </Table>

              {(() => {
                const aggregates = computeRunAggregates(selectedRun);
                return (
                  <div className="space-y-1 text-sm text-[var(--muted-foreground)]">
                    <p>
                      Confié :
                      <span className="font-semibold">
                        {" "}
                        {aggregates.quantityEntrusted} pièces
                      </span>{" "}
                      ·
                      <span className="font-semibold">
                        {" "}
                        {formatCurrency(aggregates.totalEntrusted)}
                      </span>
                    </p>
                    <p>
                      Retour :
                      <span className="font-semibold">
                        {" "}
                        {aggregates.quantityReturned} pièces
                      </span>{" "}
                      ·
                      <span className="font-semibold">
                        {" "}
                        {formatReturnRate(aggregates.returnRate)}
                      </span>
                    </p>
                    <p>
                      Vendu :
                      <span className="font-semibold">
                        {" "}
                        {aggregates.quantitySold} pièces
                      </span>{" "}
                      ·
                      <span className="font-semibold">
                        {" "}
                        {formatCurrency(aggregates.revenue)}
                      </span>
                    </p>
                  </div>
                );
              })()}

              <div className="space-y-1">
                <p className="text-sm font-medium text-[var(--foreground)]">Remarques</p>
                <textarea
                  value={selectedRun.notes}
                  onChange={(event) =>
                    handleNotesChange(selectedRun.id, event.target.value)
                  }
                  className="min-h-[80px] w-full rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--foreground)] shadow-[var(--shadow-sm)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                  placeholder="Ajouter des remarques sur la tournée (retards, incidents, demandes clients, etc.)."
                />
              </div>

              <div className="flex flex-wrap items-center justify-end gap-3 border-t border-[var(--border-subtle)] pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => handleSaveDraft(selectedRun.id)}
                >
                  Enregistrer comme brouillon
                </Button>
                <Button
                  type="button"
                  onClick={() => handleValidateRun(selectedRun.id)}
                >
                  Valider la tournée
                </Button>
              </div>
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-[var(--muted-foreground)]">
              Sélectionnez un livreur ci-dessus pour gérer les quantités par produit.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
