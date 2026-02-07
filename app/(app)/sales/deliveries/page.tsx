"use client";

import React, { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

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
import { Badge } from "@/components/ui/badge";
import { DatePicker } from "@/components/ui/date-picker";
import { ConfirmDialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { useDeliveryRuns, useUpdateDeliveryRun, useValidateDeliveryRun, useUpdateDeliveryItem } from "@/lib/hooks/useDeliveries";
import { useEmployeeProducts } from "@/lib/hooks/useEmployees";
import type { DeliveryRun, DeliveryItem, DeliveryStatus } from "@/lib/api/deliveries";

const SELLING_PERIODS = ["Matin", "Après-midi", "Soir"] as const;
type SellingPeriod = (typeof SELLING_PERIODS)[number];

type RunAggregates = {
  quantityEntrusted: number;
  totalEntrusted: number;
  quantityReturned: number;
  quantitySold: number;
  revenue: number;
  returnRate: number;
};

function computeRunAggregates(run: DeliveryRun): RunAggregates {
  const quantityEntrusted = run.items.reduce(
    (sum, item) => sum + item.quantityEntrusted,
    0,
  );
  const quantityReturned = run.items.reduce(
    (sum, item) => sum + item.quantityReturned,
    0,
  );
  const quantitySold = quantityEntrusted - quantityReturned;
  const totalEntrusted = run.items.reduce(
    (sum, item) => sum + item.quantityEntrusted * item.unitPrice,
    0,
  );
  const revenue = run.items.reduce(
    (sum, item) =>
      sum + (item.quantityEntrusted - item.quantityReturned) * item.unitPrice,
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

function getStatusVariant(status: DeliveryStatus) {
  switch (status) {
    case "draft":
      return "default" as const;
    case "in_progress":
      return "warning" as const;
    case "validated":
      return "info" as const;
    default:
      return "default" as const;
  }
}

export default function DeliveriesBoardPage() {
  const { notify } = useToast()
  const [date, setDate] = useState<string>(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{
    runId: string;
    itemId: string;
    productName: string;
  } | null>(null);

  // Real API hooks
  const { data: runs = [], isLoading, refetch } = useDeliveryRuns({ date });
  const updateDeliveryRun = useUpdateDeliveryRun();
  const validateDeliveryRun = useValidateDeliveryRun();
  const updateDeliveryItem = useUpdateDeliveryItem();

  const selectedRun = runs.find((run) => run.id === selectedRunId) ?? null;

   const { data: selectedEmployeeProducts = [] } = useEmployeeProducts(selectedRun?.employeeId ?? "");

   const filteredSelectedRunItems = useMemo(() => {
     if (!selectedRun) return [] as DeliveryItem[];

     const activeAssignments = selectedEmployeeProducts.filter((p) => p.isActive !== false);
     if (activeAssignments.length === 0) {
       return selectedRun.items;
     }

     const assignedProductIds = new Set(activeAssignments.map((p) => p.productId));
     return selectedRun.items.filter((item) => assignedProductIds.has(item.productId));
   }, [selectedEmployeeProducts, selectedRun]);

  function handleDateChange(newDate: string) {
    setDate(newDate);
    setSelectedRunId(null);
  }

  function handlePrevDay() {
    const currentDate = new Date(date);
    currentDate.setDate(currentDate.getDate() - 1);
    handleDateChange(currentDate.toISOString().slice(0, 10));
  }

  function handleNextDay() {
    const currentDate = new Date(date);
    currentDate.setDate(currentDate.getDate() + 1);
    handleDateChange(currentDate.toISOString().slice(0, 10));
  }

  async function handleItemQuantityOutChange(
    runId: string,
    itemId: string,
    quantityEntrusted: number,
  ) {
    await updateDeliveryItem.mutateAsync({
      id: itemId,
      data: { quantityEntrusted: Math.max(0, quantityEntrusted) },
    });
  }

  async function handleItemQuantityReturnedChange(
    runId: string,
    itemId: string,
    quantityReturned: number,
  ) {
    await updateDeliveryItem.mutateAsync({
      id: itemId,
      data: { quantityReturned: Math.max(0, quantityReturned) },
    });
  }

  // Placeholder functions for features not yet implemented with real API
  function handleItemSellingPeriodChange(runId: string, itemId: string, period: SellingPeriod | "") {
    console.log("Update period:", runId, itemId, period);
    // TODO: Implement when API supports period updates
  }

  function handleAddPeriodLine(runId: string, productId: string) {
    console.log("Add period line:", runId, productId);
    // TODO: Implement when API supports adding items
  }

  async function handleDeleteItem(runId: string, itemId: string) {
    console.log("Delete item:", runId, itemId);
    setPendingDelete(null);
  }

  function confirmDeleteItem() {
    if (pendingDelete) {
      handleDeleteItem(pendingDelete.runId, pendingDelete.itemId);
    }
  }

  function handleClearItem(runId: string, itemId: string) {
    console.log("Clear item:", runId, itemId);
    // TODO: Implement when API supports clearing items
  }

  function handleNotesChange(runId: string, notes: string) {
    console.log("Update notes:", runId, notes);
    // TODO: Implement when API supports notes updates
  }

  async function handleSaveDraft(runId: string) {
    await updateDeliveryRun.mutateAsync({
      id: runId,
      data: { status: "draft" },
    });
  }

  async function handleValidateRun(runId: string) {
    await validateDeliveryRun.mutateAsync(runId);
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
        .filter((item) => item.quantityEntrusted > 0)
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
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handlePrevDay}
            aria-label="Jour précédent"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <label htmlFor="delivery-date" className="text-sm font-medium text-[var(--muted-foreground)]">
              Date
            </label>
            <DatePicker
              value={date ? new Date(date) : undefined}
              onValueChange={(d) => handleDateChange(d instanceof Date ? d.toISOString().slice(0, 10) : "")}
              placeholder="Choisir une date"
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleNextDay}
            aria-label="Jour suivant"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
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
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-8 text-center text-sm text-[var(--muted-foreground)]">
                      Chargement des tournées…
                    </TableCell>
                  </TableRow>
                ) : runs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-8 text-center">
                      <p className="text-sm font-medium text-[var(--foreground)]">Aucune tournée pour cette date</p>
                      <p className="text-xs text-[var(--muted-foreground)] mt-1">
                        Les livreurs actifs apparaîtront ici automatiquement. Vérifiez qu&apos;il existe des employés avec le rôle &quot;Livreur&quot; et au moins une localisation configurée.
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  runs.map((run) => {
                    const aggregates = computeRunAggregates(run);
                    const distinctProducts = new Set(
                      run.items
                        .filter((item) => item.quantityEntrusted > 0)
                        .map((item) => item.productId),
                    );

                    return (
                      <TableRow key={run.id}>
                        <TableCell>
                          <div className="space-y-0.5">
                            <p className="font-medium">
                              {run.employeeName}
                            </p>
                            <p className="text-xs text-[var(--muted-foreground)]">
                              {run.locationName}
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
                          <Badge variant={getStatusVariant(run.status)}>
                            {getStatusLabel(run.status)}
                          </Badge>
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
                  })
                )}
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
                    {selectedRun.employeeName}
                  </p>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    {selectedRun.locationName} · {selectedRun.date}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={getStatusVariant(selectedRun.status)}>
                    {getStatusLabel(selectedRun.status)}
                  </Badge>
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
                    {(() => {
                      // Group items by productId
                      const itemsByProduct = filteredSelectedRunItems.reduce((acc, item) => {
                        if (!acc[item.productId]) {
                          acc[item.productId] = {
                            productId: item.productId,
                            productName: item.productName,
                            unitPrice: item.unitPrice,
                            items: [],
                          };
                        }
                        acc[item.productId].items.push(item);
                        return acc;
                      }, {} as Record<string, { productId: string; productName: string; unitPrice: number; items: typeof filteredSelectedRunItems }>);

                      return Object.values(itemsByProduct).map((product) => {
                        const productEntrusted = product.items.reduce(
                          (sum, item) => sum + item.quantityEntrusted,
                          0,
                        );
                        const productReturned = product.items.reduce(
                          (sum, item) => sum + item.quantityReturned,
                          0,
                        );
                        const productSold = productEntrusted - productReturned;
                        const productTotal = product.items.reduce(
                          (sum, item) =>
                            sum +
                            (item.quantityEntrusted - item.quantityReturned) *
                              item.unitPrice,
                          0,
                        );
                        const productReturnRate =
                          productEntrusted > 0
                            ? productReturned / productEntrusted
                            : 0;

                        return (
                          <React.Fragment key={product.productId}>
                            <TableRow className="bg-[var(--surface)]">
                              <TableCell>
                                <div className="space-y-0.5">
                                  <p className="font-semibold">
                                    {product.productName}
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
                                      handleAddPeriodLine(selectedRun.id, product.productId)
                                    }
                                  >
                                    + Période
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>

                            {product.items.map((item) => {
                              const soldQuantity =
                                item.quantityEntrusted - item.quantityReturned;
                              const canDelete = product.items.length > 1;
                              const lineReturnRate =
                                item.quantityEntrusted > 0
                                  ? item.quantityReturned / item.quantityEntrusted
                                  : 0;

                              return (
                                <TableRow key={item.id}>
                                  <TableCell>
                                    <select
                                      value={item.period ?? ""}
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
                                      value={item.quantityEntrusted || ""}
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
                                          setPendingDelete({
                                            runId: selectedRun.id,
                                            itemId: item.id,
                                            productName: product.productName,
                                          })
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
                      });
                    })()}
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
      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Supprimer cette ligne ?"
        description={
          pendingDelete
            ? `Voulez-vous vraiment supprimer cette ligne de ${pendingDelete.productName} ? Cette action est irréversible.`
            : undefined
        }
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        destructive
        onConfirm={confirmDeleteItem}
      />
    </div>
  );
}
