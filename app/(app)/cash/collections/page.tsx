"use client";

import { useState, useMemo } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

import { Button } from "@/components/Button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/Card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableEmptyState } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select-radix";
import { useToast } from "@/components/ui/toast";
import { useCashCollections, useUpdateCashCollection, useSubmitCashCollection } from "@/lib/hooks/useCollections";
import { useEmployees } from "@/lib/hooks/useEmployees";
import type { CashCollection } from "@/lib/api/collections";

function getStatusLabel(status: string) {
  switch (status) {
    case "pending": return "En attente";
    case "submitted": return "Soumis";
    case "validated": return "Validé";
    case "rejected": return "Rejeté";
    default: return status;
  }
}

function getStatusVariant(status: string) {
  switch (status) {
    case "pending": return "default" as const;
    case "submitted": return "warning" as const;
    case "validated": return "success" as const;
    case "rejected": return "error" as const;
    default: return "default" as const;
  }
}

function getRoleLabel(role: string) {
  switch (role) {
    case "delivery": return "Livreur";
    case "cashier": return "Caissier";
    case "manager": return "Manager";
    case "baker": return "Boulanger";
    default: return role;
  }
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "XOF",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
  });
}

// Period presets
const PERIOD_OPTIONS = [
  { value: "this_week", label: "Cette semaine" },
  { value: "this_month", label: "Ce mois" },
  { value: "last_15_days", label: "Derniers 15 jours" },
  { value: "custom", label: "Personnalisée..." },
];

function getPeriodDates(periodValue: string): { startDate: string; endDate: string } {
  const today = new Date();
  const endDate = today.toISOString().slice(0, 10);
  
  switch (periodValue) {
    case "this_week": {
      const start = new Date(today);
      start.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
      return { startDate: start.toISOString().slice(0, 10), endDate };
    }
    case "this_month": {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      return { startDate: start.toISOString().slice(0, 10), endDate };
    }
    case "last_15_days": {
      const start = new Date(today);
      start.setDate(today.getDate() - 15);
      return { startDate: start.toISOString().slice(0, 10), endDate };
    }
    default:
      return { startDate: endDate, endDate };
  }
}

interface PaymentFormProps {
  collection: CashCollection;
  onSave: () => void;
  onCancel: () => void;
}

function PaymentForm({ collection, onSave, onCancel }: PaymentFormProps) {
  const { notify } = useToast();
  const updateCollection = useUpdateCashCollection();
  const submitCollection = useSubmitCashCollection();
  
  const [cashAmount, setCashAmount] = useState<number>(collection.cashAmount || 0);
  const [cardAmount, setCardAmount] = useState<number>(collection.cardAmount || 0);
  const [mobileAmount, setMobileAmount] = useState<number>(collection.mobileAmount || 0);
  const [notes, setNotes] = useState<string>(collection.notes || "");
  
  const totalCollected = cashAmount + cardAmount + mobileAmount;
  const variance = totalCollected - collection.expectedAmount;
  
  const handleSave = async (submit = false) => {
    try {
      await updateCollection.mutateAsync({
        id: collection.id,
        data: {
          cashAmount,
          cardAmount,
          mobileAmount,
          actualAmount: totalCollected,
          notes,
        },
      });
      
      if (submit) {
        await submitCollection.mutateAsync(collection.id);
      }
      
      notify({
        variant: "success",
        title: submit ? "Collecte soumise" : "Collecte enregistrée",
        description: `Montant: ${formatCurrency(totalCollected)}`,
      });
      onSave();
    } catch {
      notify({
        variant: "error",
        title: "Erreur",
        description: "Impossible d'enregistrer la collecte.",
      });
    }
  };
  
  return (
    <div className="space-y-4 p-4 bg-[var(--secondary)]/30 rounded-lg">
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--foreground)]">Espèces</label>
          <input
            type="number"
            min={0}
            value={cashAmount || ""}
            onChange={(e) => setCashAmount(Number(e.target.value) || 0)}
            className="w-full h-10 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--card)] px-3 text-right text-[var(--foreground)]"
            placeholder="0"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--foreground)]">Carte</label>
          <input
            type="number"
            min={0}
            value={cardAmount || ""}
            onChange={(e) => setCardAmount(Number(e.target.value) || 0)}
            className="w-full h-10 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--card)] px-3 text-right text-[var(--foreground)]"
            placeholder="0"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--foreground)]">Mobile Money</label>
          <input
            type="number"
            min={0}
            value={mobileAmount || ""}
            onChange={(e) => setMobileAmount(Number(e.target.value) || 0)}
            className="w-full h-10 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--card)] px-3 text-right text-[var(--foreground)]"
            placeholder="0"
          />
        </div>
      </div>
      
      <div className="flex justify-between items-center py-2 border-t border-[var(--border)]">
        <span className="text-sm text-[var(--muted-foreground)]">Total collecté</span>
        <span className="font-semibold text-[var(--foreground)]">{formatCurrency(totalCollected)}</span>
      </div>
      
      <div className="flex justify-between items-center">
        <span className="text-sm text-[var(--muted-foreground)]">
          Écart vs attendu ({formatCurrency(collection.expectedAmount)})
        </span>
        <span className={`font-semibold ${variance >= 0 ? "text-[var(--success)]" : "text-[var(--error)]"}`}>
          {variance >= 0 ? "+" : ""}{formatCurrency(variance)}
        </span>
      </div>
      
      <div className="space-y-2">
        <label className="text-sm font-medium text-[var(--foreground)]">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Remarques sur la collecte..."
          className="w-full min-h-[60px] rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--foreground)]"
        />
      </div>
      
      <div className="flex justify-end gap-2 pt-2">
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Annuler
        </Button>
        <Button 
          size="sm" 
          variant="secondary" 
          onClick={() => handleSave(false)}
          disabled={updateCollection.isPending}
        >
          Enregistrer
        </Button>
        <Button 
          size="sm" 
          onClick={() => handleSave(true)}
          disabled={updateCollection.isPending || submitCollection.isPending}
        >
          Enregistrer et soumettre
        </Button>
      </div>
    </div>
  );
}

export default function CollectionsPage() {
  const { notify } = useToast();
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("all");
  const [periodValue, setPeriodValue] = useState<string>("this_week");
  const [customDateRange, setCustomDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [expandedCollectionId, setExpandedCollectionId] = useState<string | null>(null);
  
  // Fetch employees for selector
  const { data: employees = [] } = useEmployees();
  const employeeOptions = useMemo(() => [
    { value: "", label: "Tous les employés" },
    ...employees.map((emp) => ({
      value: emp.id,
      label: `${emp.firstName} ${emp.lastName} (${getRoleLabel(emp.role)})`,
    })),
  ], [employees]);
  
  // Calculate date range from period
  const { startDate, endDate } = useMemo(() => {
    if (periodValue === "custom" && customDateRange.from) {
      const from = customDateRange.from.toISOString().slice(0, 10);
      const to = customDateRange.to?.toISOString().slice(0, 10) || from;
      return { startDate: from, endDate: to };
    }
    return getPeriodDates(periodValue);
  }, [periodValue, customDateRange]);
  
  // Fetch collections - use a date param since API may not support range yet
  const { data: collections = [], isLoading, error } = useCashCollections({ 
    date: endDate,
    employeeId: selectedEmployeeId === "all" ? undefined : selectedEmployeeId,
  });
  
  // Filter by date range if needed (client-side until API supports range)
  const filteredCollections = useMemo(() => {
    return collections.filter((c) => c.date >= startDate && c.date <= endDate);
  }, [collections, startDate, endDate]);
  
  // Calculate summary stats
  const summary = useMemo(() => {
    const totalExpected = filteredCollections.reduce((sum, c) => sum + c.expectedAmount, 0);
    const totalCollected = filteredCollections.reduce((sum, c) => sum + (c.actualAmount || 0), 0);
    const balance = totalCollected - totalExpected;
    const collectionRate = totalExpected > 0 ? (totalCollected / totalExpected) * 100 : 0;
    const settledCount = filteredCollections.filter((c) => c.isSettled).length;
    
    return {
      totalExpected,
      totalCollected,
      balance,
      collectionRate,
      count: filteredCollections.length,
      settledCount,
    };
  }, [filteredCollections]);
  
  const handleExpand = (collectionId: string) => {
    setExpandedCollectionId(expandedCollectionId === collectionId ? null : collectionId);
  };

  return (
    <div className="space-y-6">
      {/* Header with selectors */}
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">
            Encaissements
          </h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Collecte de caisse par employé et par période
          </p>
        </div>
        
        <div className="flex flex-wrap gap-4 items-end">
          <div className="w-64 space-y-1.5">
            <label className="text-xs font-medium text-[var(--muted-foreground)] block">
              Employé
            </label>
            <Select
              value={selectedEmployeeId}
              onValueChange={setSelectedEmployeeId}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Tous les employés" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Tous les employés</SelectItem>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName} ({getRoleLabel(emp.role)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-48 space-y-1.5">
            <label className="text-xs font-medium text-[var(--muted-foreground)] block">
              Période
            </label>
            <Select
              value={periodValue}
              onValueChange={setPeriodValue}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIOD_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {periodValue === "custom" && (
            <div className="w-64">
              <label className="text-xs font-medium text-[var(--muted-foreground)] mb-1 block">
                Dates
              </label>
              <DatePicker
                value={customDateRange.from}
                onValueChange={(val) => {
                  if (val instanceof Date) {
                    setCustomDateRange({ from: val, to: val });
                  } else if (val && "from" in val) {
                    setCustomDateRange({ from: val.from, to: val.to });
                  }
                }}
                placeholder="Choisir une période"
              />
            </div>
          )}
        </div>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-[var(--muted-foreground)]">Attendu</p>
            <p className="text-2xl font-bold text-[var(--foreground)] mt-1">
              {formatCurrency(summary.totalExpected)}
            </p>
            <p className="text-xs text-[var(--muted-foreground)] mt-1">
              {summary.count} tournée{summary.count !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-[var(--muted-foreground)]">Collecté</p>
            <p className="text-2xl font-bold text-[var(--foreground)] mt-1">
              {formatCurrency(summary.totalCollected)}
            </p>
            <p className="text-xs text-[var(--muted-foreground)] mt-1">
              {summary.settledCount} réglée{summary.settledCount !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-[var(--muted-foreground)]">Solde restant</p>
            <p className={`text-2xl font-bold mt-1 ${summary.balance >= 0 ? "text-[var(--success)]" : "text-[var(--error)]"}`}>
              {formatCurrency(summary.balance)}
            </p>
            <p className="text-xs text-[var(--muted-foreground)] mt-1">
              {summary.count - summary.settledCount} en attente
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-[var(--muted-foreground)]">Performance</p>
            <p className="text-2xl font-bold text-[var(--foreground)] mt-1">
              {summary.collectionRate.toFixed(1)}%
            </p>
            <p className="text-xs text-[var(--muted-foreground)] mt-1">
              Taux d&apos;encaissement
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Collections Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Collectes {selectedEmployeeId && employees.find((e) => e.id === selectedEmployeeId)
              ? `· ${employees.find((e) => e.id === selectedEmployeeId)?.firstName} ${employees.find((e) => e.id === selectedEmployeeId)?.lastName}`
              : ""}
          </CardTitle>
          <CardDescription>
            {formatDate(startDate)} – {formatDate(endDate)}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow variant="header">
                <TableHead>Date</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Attendu</TableHead>
                <TableHead>Collecté</TableHead>
                <TableHead>Écart</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableEmptyState colSpan={7} message="Chargement des collectes..." />
              ) : error ? (
                <TableEmptyState
                  colSpan={7}
                  message="Erreur lors du chargement des collectes"
                  action={
                    <Button size="sm" variant="secondary" onClick={() => window.location.reload()}>
                      Réessayer
                    </Button>
                  }
                />
              ) : filteredCollections.length === 0 ? (
                <TableEmptyState
                  colSpan={7}
                  message="Aucune collecte pour cette période"
                />
              ) : (
                filteredCollections.map((collection) => (
                  <TableRow key={collection.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-[var(--foreground)]">
                          {formatDate(collection.date)}
                        </p>
                        <p className="text-xs text-[var(--muted-foreground)]">
                          {collection.employeeName}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-[var(--muted-foreground)]">
                        {collection.source || "Livraison"}
                      </span>
                    </TableCell>
                    <TableCell numeric>
                      <span className="font-medium text-[var(--foreground)]">
                        {formatCurrency(collection.expectedAmount)}
                      </span>
                    </TableCell>
                    <TableCell numeric>
                      {collection.actualAmount !== null ? (
                        <span className="font-medium text-[var(--foreground)]">
                          {formatCurrency(collection.actualAmount)}
                        </span>
                      ) : (
                        <span className="text-sm text-[var(--muted-foreground)]">—</span>
                      )}
                    </TableCell>
                    <TableCell numeric>
                      {collection.variance !== null ? (
                        <span className={`font-medium ${collection.variance >= 0 ? "text-[var(--success)]" : "text-[var(--error)]"}`}>
                          {collection.variance >= 0 ? "+" : ""}{formatCurrency(collection.variance)}
                        </span>
                      ) : (
                        <span className="text-sm text-[var(--muted-foreground)]">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(collection.status)}>
                        {getStatusLabel(collection.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleExpand(collection.id)}
                      >
                        {collection.status === "pending" ? "Saisir" : "Voir"}
                        {expandedCollectionId === collection.id ? (
                          <ChevronUp className="size-4 ml-1" />
                        ) : (
                          <ChevronDown className="size-4 ml-1" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          
          {/* Inline Payment Form */}
          {expandedCollectionId && (
            <div className="border-t border-[var(--border)]">
              {(() => {
                const collection = filteredCollections.find((c) => c.id === expandedCollectionId);
                if (!collection) return null;
                return (
                  <PaymentForm
                    collection={collection}
                    onSave={() => setExpandedCollectionId(null)}
                    onCancel={() => setExpandedCollectionId(null)}
                  />
                );
              })()}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Info card */}
      <Card variant="ghost" className="border border-dashed">
        <CardContent className="py-6 text-center">
          <p className="text-sm text-[var(--muted-foreground)]">
            Les collectes sont créées automatiquement lors de la validation des tournées de livraison.
            Cliquez sur &quot;Saisir&quot; pour enregistrer les montants collectés.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
