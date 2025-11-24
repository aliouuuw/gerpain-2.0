"use client";

import { useState } from "react";

import { Button } from "@/components/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/Card";

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
      return "bg-stone-100 text-stone-700";
    case "in_progress":
      return "bg-amber-100 text-amber-800";
    case "validated":
      return "bg-emerald-100 text-emerald-800";
    default:
      return "bg-stone-100 text-stone-700";
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
    <div className="space-y-8">
      <div className="stagger-item space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-stone-900">
          Tableau des livraisons du jour
        </h1>
        <p className="text-stone-600">
          Suivez, pour chaque livreur, les quantités confiées, les retours et le
          montant à encaisser. Détaillez ensuite par produit si nécessaire.
        </p>
      </div>

      <div className="stagger-item flex flex-wrap items-center gap-4">
        <div className="space-y-1">
          <label
            htmlFor="delivery-date"
            className="text-sm font-medium text-stone-700"
          >
            Date des livraisons
          </label>
          <input
            id="delivery-date"
            type="date"
            value={date}
            onChange={(event) => handleDateChange(event.target.value)}
            className="h-9 rounded-md border border-stone-300 bg-white px-3 text-sm text-stone-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-1"
          />
        </div>

        <p className="text-sm text-stone-500">
          Le point de vente actif est sélectionné globalement dans l&apos;interface
          (en-tête). Ce tableau affiche les livraisons pour ce point de vente et
          la date choisie.
        </p>
      </div>

      <Card className="stagger-item overflow-hidden">
        <CardHeader className="space-y-1">
          <CardTitle>Vue d&apos;ensemble par livreur</CardTitle>
          <CardDescription>
            Une ligne par livreur avec les principaux indicateurs : confié,
            retours, vendu et montant dû. Cliquez sur « Détails » pour saisir ou
            ajuster les quantités par produit.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="w-full overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50">
                  <th className="px-4 py-2 text-left font-medium text-stone-700">
                    Livreur
                  </th>
                  <th className="px-4 py-2 text-right font-medium text-stone-700">
                    Confié
                  </th>
                  <th className="px-4 py-2 text-right font-medium text-stone-700">
                    Produits
                  </th>
                  <th className="px-4 py-2 text-right font-medium text-stone-700">
                    Retour
                  </th>
                  <th className="px-4 py-2 text-right font-medium text-stone-700">
                    % retour
                  </th>
                  <th className="px-4 py-2 text-right font-medium text-stone-700">
                    Vendu
                  </th>
                  <th className="px-4 py-2 text-right font-medium text-stone-700">
                    Montant dû
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-stone-700">
                    Statut
                  </th>
                  <th className="px-4 py-2 text-right font-medium text-stone-700">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
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
                    <tr
                      key={run.id}
                      className="border-b border-stone-100 bg-white hover:bg-stone-50/70"
                    >
                      <td className="px-4 py-3 align-top">
                        <div className="space-y-0.5">
                          <p className="font-medium text-stone-900">
                            {employee?.name ?? "Livreur"}
                          </p>
                          <p className="text-xs text-stone-500">
                            {employee?.routeLabel ?? "Tournée"}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right align-top">
                        <p className="font-medium text-stone-900">
                          {aggregates.quantityEntrusted}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right align-top">
                        <p className="font-medium text-stone-900">
                          {distinctProducts.size}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right align-top">
                        <p className="font-medium text-stone-900">
                          {aggregates.quantityReturned}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right align-top">
                        <p className="font-medium text-stone-900">
                          {formatReturnRate(aggregates.returnRate)}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right align-top">
                        <p className="font-medium text-stone-900">
                          {aggregates.quantitySold}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right align-top">
                        <p className="font-medium text-stone-900">
                          {formatCurrency(aggregates.revenue)}
                        </p>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${getStatusClasses(
                            run.status,
                          )}`}
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          {getStatusLabel(run.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right align-top">
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => setSelectedRunId(run.id)}
                        >
                          Détails
                        </Button>
                      </td>
                    </tr>
                  );
                })}
                <tr className="border-t border-stone-200 bg-stone-50">
                  <td className="px-4 py-3 text-left text-sm font-semibold text-stone-900">
                    Total journée
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-stone-900">
                    {overallTotals.quantityEntrusted}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-stone-900">
                    {overallDistinctProductsCount}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-stone-900">
                    {overallTotals.quantityReturned}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-stone-900">
                    {formatReturnRate(overallReturnRate)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-stone-900">
                    {overallTotals.quantitySold}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-stone-900">
                    {formatCurrency(overallTotals.revenue)}
                  </td>
                  <td className="px-4 py-3" colSpan={2}>
                    <p className="text-xs text-stone-500">
                      Vue d&apos;ensemble de la journée, toutes tournées
                      confondues.
                    </p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card className="stagger-item overflow-hidden">
        <CardHeader className="space-y-1">
          <CardTitle>Détail par livreur et par produit</CardTitle>
          <CardDescription>
            Sélectionnez un livreur dans le tableau ci-dessus pour saisir ou
            ajuster les quantités par produit.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {selectedRun ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium text-stone-900">
                    {
                      mockEmployees.find(
                        (employee) => employee.id === selectedRun.employeeId,
                      )?.name
                    }
                  </p>
                  <p className="text-xs text-stone-500">
                    {
                      mockEmployees.find(
                        (employee) => employee.id === selectedRun.employeeId,
                      )?.routeLabel
                    }
                  </p>
                  <p className="text-xs text-stone-500">
                    Date : {selectedRun.date} · Point de vente :
                    {" "}
                    {selectedRun.locationName}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${getStatusClasses(
                      selectedRun.status,
                    )}`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    {getStatusLabel(selectedRun.status)}
                  </span>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setSelectedRunId(null)}
                  >
                    Fermer le détail
                  </Button>
                </div>
              </div>

              <div className="w-full overflow-x-auto">
                <table className="min-w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-stone-200 bg-stone-50">
                      <th className="px-4 py-2 text-left font-medium text-stone-700">
                        Produit
                      </th>
                      <th className="px-4 py-2 text-right font-medium text-stone-700">
                        Prix unit.
                      </th>
                      <th className="px-4 py-2 text-right font-medium text-stone-700">
                        Confié
                      </th>
                      <th className="px-4 py-2 text-right font-medium text-stone-700">
                        Retour
                      </th>
                      <th className="px-4 py-2 text-right font-medium text-stone-700">
                        % retour
                      </th>
                      <th className="px-4 py-2 text-right font-medium text-stone-700">
                        Vendu
                      </th>
                      <th className="px-4 py-2 text-right font-medium text-stone-700">
                        Total
                      </th>
                      <th className="px-4 py-2 text-right font-medium text-stone-700">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
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
                        <>
                          <tr className="border-b border-stone-100 bg-stone-50/80">
                            <td className="px-4 py-3 align-top">
                              <div className="space-y-0.5">
                                <p className="font-semibold text-stone-900">
                                  {product.name}
                                </p>
                                <p className="text-xs text-stone-500">
                                  {product.unit}
                                </p>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right align-top">
                              <p className="text-sm font-semibold text-stone-900">
                                {formatCurrency(product.unitPrice)}
                              </p>
                            </td>
                            <td className="px-4 py-3 text-right align-top">
                              <p className="text-sm font-semibold text-stone-900">
                                {productEntrusted}
                              </p>
                            </td>
                            <td className="px-4 py-3 text-right align-top">
                              <p className="text-sm font-semibold text-stone-900">
                                {productReturned}
                              </p>
                            </td>
                            <td className="px-4 py-3 text-right align-top">
                              <p className="text-sm font-semibold text-stone-900">
                                {formatReturnRate(productReturnRate)}
                              </p>
                            </td>
                            <td className="px-4 py-3 text-right align-top">
                              <p className="text-sm font-semibold text-stone-900">
                                {productSold}
                              </p>
                            </td>
                            <td className="px-4 py-3 text-right align-top">
                              <p className="text-sm font-semibold text-stone-900">
                                {formatCurrency(productTotal)}
                              </p>
                            </td>
                            <td className="px-4 py-3 text-right align-top">
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
                            </td>
                          </tr>

                          {productItems.map((item) => {
                            const soldQuantity =
                              item.quantityOut - item.quantityReturned;
                            const canDelete = productItems.length > 1;
                            const lineReturnRate =
                              item.quantityOut > 0
                                ? item.quantityReturned / item.quantityOut
                                : 0;

                            return (
                              <tr
                                key={item.id}
                                className="border-b border-stone-100 bg-white hover:bg-stone-50/70"
                              >
                                <td className="px-4 py-3 align-top">
                                  <select
                                    value={item.sellingPeriod ?? ""}
                                    onChange={(event) =>
                                      handleItemSellingPeriodChange(
                                        selectedRun.id,
                                        item.id,
                                        event.target.value as SellingPeriod | "",
                                      )
                                    }
                                    className="h-8 w-full rounded-md border border-stone-300 bg-white px-2 text-xs text-stone-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-1"
                                  >
                                    <option value="">Non précisé</option>
                                    {SELLING_PERIODS.map((period) => (
                                      <option key={period} value={period}>
                                        {period}
                                      </option>
                                    ))}
                                  </select>
                                </td>
                                <td className="px-4 py-3 text-right align-top">
                                  <p className="text-sm text-stone-900">⇓</p>
                                </td>
                                <td className="px-4 py-3 text-right align-top">
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
                                    className="h-8 w-20 rounded-md border border-stone-300 bg-white px-2 text-right text-xs text-stone-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-1"
                                  />
                                </td>
                                <td className="px-4 py-3 text-right align-top">
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
                                    className="h-8 w-20 rounded-md border border-stone-300 bg-white px-2 text-right text-xs text-stone-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-1"
                                  />
                                </td>
                                <td className="px-4 py-3 text-right align-top">
                                  <p className="text-sm text-stone-900">
                                    {formatReturnRate(lineReturnRate)}
                                  </p>
                                </td>
                                <td className="px-4 py-3 text-right align-top">
                                  <p className="text-sm font-medium text-stone-900">
                                    {soldQuantity}
                                  </p>
                                </td>
                                <td className="px-4 py-3 text-right align-top">
                                  <p className="text-sm font-medium text-stone-900">
                                    {formatCurrency(soldQuantity * item.unitPrice)}
                                  </p>
                                </td>
                                <td className="px-4 py-3 text-right align-top">
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
                                      className="h-8 px-2 text-xs text-red-700 hover:text-red-800 disabled:text-stone-300"
                                      disabled={!canDelete}
                                      onClick={() =>
                                        handleDeleteItem(selectedRun.id, item.id)
                                      }
                                    >
                                      Supprimer
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {(() => {
                const aggregates = computeRunAggregates(selectedRun);
                return (
                  <div className="space-y-1 text-sm text-stone-700">
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
                <p className="text-sm font-medium text-stone-700">Remarques</p>
                <textarea
                  value={selectedRun.notes}
                  onChange={(event) =>
                    handleNotesChange(selectedRun.id, event.target.value)
                  }
                  className="min-h-[80px] w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-1"
                  placeholder="Ajouter des remarques sur la tournée (retards, incidents, demandes clients, etc.)."
                />
              </div>

              <div className="flex flex-wrap items-center justify-end gap-3 border-t border-stone-200 pt-4">
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
            </>
          ) : (
            <p className="text-sm text-stone-500">
              Sélectionnez un livreur dans le tableau récapitulatif pour voir le
              détail par produit et saisir les quantités confiées et les
              retours.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
