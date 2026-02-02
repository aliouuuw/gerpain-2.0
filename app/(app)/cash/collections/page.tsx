"use client";

import { useState } from "react";
import { Banknote, CreditCard, Smartphone, CheckCircle2, XCircle } from "lucide-react";

import { Button } from "@/components/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/Card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableEmptyState } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DatePicker } from "@/components/ui/date-picker";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";

type CollectionStatus = "pending" | "submitted" | "validated" | "rejected";

type CashCollection = {
  id: string;
  employeeId: string;
  employeeName: string;
  routeLabel: string;
  date: string;
  expectedAmount: number;
  actualAmount: number | null;
  cashAmount: number;
  cardAmount: number;
  mobileAmount: number;
  variance: number | null;
  status: CollectionStatus;
  notes: string;
};

const mockEmployees = [
  { id: "emp-1", name: "Moussa Diallo", routeLabel: "Route Nord" },
  { id: "emp-2", name: "Fatou Ndiaye", routeLabel: "Route Sud" },
  { id: "emp-3", name: "Ibrahima Sow", routeLabel: "Route Centre" },
  { id: "emp-4", name: "Aminata Ba", routeLabel: "Route Est" },
];

function createInitialCollections(date: string): CashCollection[] {
  return mockEmployees.map((emp, index) => {
    const expected = 150000 + Math.floor(Math.random() * 100000);
    const hasCollection = index < 2;
    const actual = hasCollection ? expected + Math.floor((Math.random() - 0.5) * 20000) : null;
    return {
      id: `col-${emp.id}-${date}`,
      employeeId: emp.id,
      employeeName: emp.name,
      routeLabel: emp.routeLabel,
      date,
      expectedAmount: expected,
      actualAmount: actual,
      cashAmount: actual ? Math.floor(actual * 0.7) : 0,
      cardAmount: actual ? Math.floor(actual * 0.2) : 0,
      mobileAmount: actual ? actual - Math.floor(actual * 0.7) - Math.floor(actual * 0.2) : 0,
      variance: actual !== null ? actual - expected : null,
      status: hasCollection ? (index === 0 ? "validated" : "submitted") : "pending",
      notes: "",
    };
  });
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "XOF",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function getStatusLabel(status: CollectionStatus) {
  switch (status) {
    case "pending":
      return "En attente";
    case "submitted":
      return "Soumis";
    case "validated":
      return "Validé";
    case "rejected":
      return "Rejeté";
    default:
      return status;
  }
}

function getStatusVariant(status: CollectionStatus) {
  switch (status) {
    case "pending":
      return "default" as const;
    case "submitted":
      return "warning" as const;
    case "validated":
      return "success" as const;
    case "rejected":
      return "error" as const;
    default:
      return "default" as const;
  }
}

function getVarianceClass(variance: number | null, expected: number) {
  if (variance === null) return "";
  const rate = Math.abs(variance) / expected;
  if (rate <= 0.02) return "text-[var(--success)]";
  if (rate <= 0.1) return "text-[var(--warning)]";
  return "text-[var(--error)]";
}

export default function CollectionsPage() {
  const { notify } = useToast();
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [collections, setCollections] = useState<CashCollection[]>(() => createInitialCollections(date));
  const [selectedCollection, setSelectedCollection] = useState<CashCollection | null>(null);
  const [formData, setFormData] = useState({
    cashAmount: 0,
    cardAmount: 0,
    mobileAmount: 0,
    notes: "",
  });

  const handleDateChange = (newDate: string) => {
    setDate(newDate);
    setCollections(createInitialCollections(newDate));
  };

  const openCollectionForm = (collection: CashCollection) => {
    setSelectedCollection(collection);
    setFormData({
      cashAmount: collection.cashAmount,
      cardAmount: collection.cardAmount,
      mobileAmount: collection.mobileAmount,
      notes: collection.notes,
    });
  };

  const handleSubmitCollection = () => {
    if (!selectedCollection) return;

    const totalActual = formData.cashAmount + formData.cardAmount + formData.mobileAmount;
    const variance = totalActual - selectedCollection.expectedAmount;
    const varianceRate = Math.abs(variance) / selectedCollection.expectedAmount;

    if (varianceRate > 0.1 && !formData.notes.trim()) {
      notify({
        variant: "warning",
        title: "Note requise",
        description: "Veuillez ajouter une note pour justifier l'écart important.",
      });
      return;
    }

    setCollections((prev) =>
      prev.map((col) =>
        col.id === selectedCollection.id
          ? {
              ...col,
              actualAmount: totalActual,
              cashAmount: formData.cashAmount,
              cardAmount: formData.cardAmount,
              mobileAmount: formData.mobileAmount,
              variance,
              notes: formData.notes,
              status: "submitted",
            }
          : col
      )
    );

    notify({
      variant: "success",
      title: "Collecte enregistrée",
      description: `Collecte de ${selectedCollection.employeeName} soumise pour validation.`,
    });

    setSelectedCollection(null);
  };

  const handleValidate = (collectionId: string) => {
    setCollections((prev) =>
      prev.map((col) =>
        col.id === collectionId ? { ...col, status: "validated" } : col
      )
    );
    notify({
      variant: "success",
      title: "Collecte validée",
    });
  };

  const handleReject = (collectionId: string) => {
    setCollections((prev) =>
      prev.map((col) =>
        col.id === collectionId ? { ...col, status: "rejected" } : col
      )
    );
    notify({
      variant: "error",
      title: "Collecte rejetée",
      description: "La collecte a été rejetée et doit être corrigée.",
    });
  };

  const totals = collections.reduce(
    (acc, col) => ({
      expected: acc.expected + col.expectedAmount,
      actual: acc.actual + (col.actualAmount ?? 0),
      collected: acc.collected + (col.actualAmount !== null ? 1 : 0),
    }),
    { expected: 0, actual: 0, collected: 0 }
  );

  const totalVariance = totals.actual - totals.expected;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">
            Encaissements
          </h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Collectez et validez les fonds remis par les livreurs
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-[var(--muted-foreground)]">Date</span>
          <DatePicker
            value={date ? new Date(date) : undefined}
            onValueChange={(d) => handleDateChange(d instanceof Date ? d.toISOString().slice(0, 10) : "")}
            placeholder="Choisir une date"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Montant attendu</CardDescription>
            <CardTitle className="text-2xl">{formatCurrency(totals.expected)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-[var(--muted-foreground)]">
              {collections.length} livreurs · {date}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Montant collecté</CardDescription>
            <CardTitle className="text-2xl">{formatCurrency(totals.actual)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-[var(--muted-foreground)]">
              {totals.collected} / {collections.length} collectes effectuées
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Écart</CardDescription>
            <CardTitle className={`text-2xl ${totalVariance >= 0 ? "text-[var(--success)]" : "text-[var(--error)]"}`}>
              {totalVariance >= 0 ? "+" : ""}{formatCurrency(totalVariance)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-[var(--muted-foreground)]">
              {((totalVariance / totals.expected) * 100).toFixed(1)}% du montant attendu
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Collectes par livreur</CardTitle>
          <CardDescription>Enregistrez et validez les encaissements du jour</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow variant="header">
                <TableHead>Livreur</TableHead>
                <TableHead numeric>Attendu</TableHead>
                <TableHead numeric>Collecté</TableHead>
                <TableHead numeric>Écart</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {collections.length === 0 ? (
                <TableEmptyState colSpan={6} message="Aucune collecte pour cette date" />
              ) : (
                collections.map((col) => (
                  <TableRow key={col.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-[var(--foreground)]">{col.employeeName}</p>
                        <p className="text-xs text-[var(--muted-foreground)]">{col.routeLabel}</p>
                      </div>
                    </TableCell>
                    <TableCell numeric>{formatCurrency(col.expectedAmount)}</TableCell>
                    <TableCell numeric>
                      {col.actualAmount !== null ? formatCurrency(col.actualAmount) : "—"}
                    </TableCell>
                    <TableCell numeric>
                      {col.variance !== null ? (
                        <span className={getVarianceClass(col.variance, col.expectedAmount)}>
                          {col.variance >= 0 ? "+" : ""}{formatCurrency(col.variance)}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(col.status)}>{getStatusLabel(col.status)}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {col.status === "pending" && (
                          <Button size="sm" variant="primary" onClick={() => openCollectionForm(col)}>
                            Collecter
                          </Button>
                        )}
                        {col.status === "submitted" && (
                          <>
                            <Button size="sm" variant="soft" onClick={() => handleValidate(col.id)}>
                              <CheckCircle2 className="size-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleReject(col.id)}>
                              <XCircle className="size-4 text-[var(--error)]" />
                            </Button>
                          </>
                        )}
                        {col.status === "rejected" && (
                          <Button size="sm" variant="secondary" onClick={() => openCollectionForm(col)}>
                            Corriger
                          </Button>
                        )}
                        {col.status === "validated" && (
                          <span className="text-xs text-[var(--muted-foreground)]">Terminé</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!selectedCollection} onOpenChange={(open) => !open && setSelectedCollection(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enregistrer la collecte</DialogTitle>
            <DialogDescription>
              {selectedCollection?.employeeName} · {selectedCollection?.routeLabel}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="rounded-lg bg-[var(--secondary)] p-4">
              <p className="text-sm text-[var(--muted-foreground)]">Montant attendu</p>
              <p className="text-xl font-semibold text-[var(--foreground)]">
                {selectedCollection ? formatCurrency(selectedCollection.expectedAmount) : "—"}
              </p>
            </div>

            <div className="space-y-3">
              <label className="flex items-center gap-3 rounded-lg border border-[var(--border)] p-3">
                <Banknote className="size-5 text-[var(--muted-foreground)]" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Espèces</p>
                </div>
                <input
                  type="number"
                  value={formData.cashAmount}
                  onChange={(e) => setFormData((prev) => ({ ...prev, cashAmount: Number(e.target.value) }))}
                  className="w-32 rounded-md border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-right text-sm"
                  min={0}
                />
              </label>

              <label className="flex items-center gap-3 rounded-lg border border-[var(--border)] p-3">
                <CreditCard className="size-5 text-[var(--muted-foreground)]" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Carte bancaire</p>
                </div>
                <input
                  type="number"
                  value={formData.cardAmount}
                  onChange={(e) => setFormData((prev) => ({ ...prev, cardAmount: Number(e.target.value) }))}
                  className="w-32 rounded-md border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-right text-sm"
                  min={0}
                />
              </label>

              <label className="flex items-center gap-3 rounded-lg border border-[var(--border)] p-3">
                <Smartphone className="size-5 text-[var(--muted-foreground)]" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Mobile Money</p>
                </div>
                <input
                  type="number"
                  value={formData.mobileAmount}
                  onChange={(e) => setFormData((prev) => ({ ...prev, mobileAmount: Number(e.target.value) }))}
                  className="w-32 rounded-md border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-right text-sm"
                  min={0}
                />
              </label>
            </div>

            <div className="rounded-lg border border-[var(--border)] p-3">
              <div className="flex items-center justify-between">
                <p className="font-medium">Total collecté</p>
                <p className="text-lg font-semibold">
                  {formatCurrency(formData.cashAmount + formData.cardAmount + formData.mobileAmount)}
                </p>
              </div>
              {selectedCollection && (
                <p className={`mt-1 text-sm ${getVarianceClass(
                  formData.cashAmount + formData.cardAmount + formData.mobileAmount - selectedCollection.expectedAmount,
                  selectedCollection.expectedAmount
                )}`}>
                  Écart: {formData.cashAmount + formData.cardAmount + formData.mobileAmount - selectedCollection.expectedAmount >= 0 ? "+" : ""}
                  {formatCurrency(formData.cashAmount + formData.cardAmount + formData.mobileAmount - selectedCollection.expectedAmount)}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--foreground)]">
                Notes (obligatoire si écart {">"} 10%)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                className="mt-1.5 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm"
                rows={2}
                placeholder="Expliquez tout écart significatif..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setSelectedCollection(null)}>
              Annuler
            </Button>
            <Button onClick={handleSubmitCollection}>
              Soumettre la collecte
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
