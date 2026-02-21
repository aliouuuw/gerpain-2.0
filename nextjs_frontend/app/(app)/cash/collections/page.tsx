"use client";

import { Fragment, useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, ChevronUp, X } from "lucide-react";

import { Button } from "@/components/Button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/Card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableEmptyState } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select-radix";
import { useToast } from "@/components/ui/toast";
import { useCashCollections, useUpdateCashCollection, useSubmitCashCollection, useValidateCashCollection, useRejectCashCollection } from "@/lib/hooks/useCollections";
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
      const dayOfWeek = today.getDay();
      // Adjust to Monday (0 = Sunday, 1 = Monday, so we need to subtract dayOfWeek-1)
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      start.setDate(today.getDate() - daysToMonday); // Start of week (Monday)
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
  const validateCollection = useValidateCashCollection();
  const rejectCollection = useRejectCashCollection();
  
  const [cashAmount, setCashAmount] = useState<number>(collection.cashAmount || 0);
  const [cardAmount, setCardAmount] = useState<number>(collection.cardAmount || 0);
  const [mobileAmount, setMobileAmount] = useState<number>(collection.mobileAmount || 0);
  const [notes, setNotes] = useState<string>(collection.notes || "");
  const [rejectReason, setRejectReason] = useState<string>(collection.rejectionReason || "");
  
  const totalCollected = cashAmount + cardAmount + mobileAmount;
  const variance = totalCollected - collection.expectedAmount;
  const isReadOnly = collection.status === "validated";
  const isSubmitted = collection.status === "submitted";
  const isRejected = collection.status === "rejected";
  
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

  const handleValidate = async () => {
    try {
      await validateCollection.mutateAsync(collection.id);
      onSave();
    } catch {
      // handled by hook toast
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      notify({
        variant: "error",
        title: "Motif requis",
        description: "Veuillez saisir la raison du rejet.",
      });
      return;
    }

    try {
      await rejectCollection.mutateAsync({
        id: collection.id,
        reason: rejectReason.trim(),
      });
      onSave();
    } catch {
      // handled by hook toast
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
            disabled={isReadOnly || isSubmitted}
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
            disabled={isReadOnly || isSubmitted}
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
            disabled={isReadOnly || isSubmitted}
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
          disabled={isReadOnly || isSubmitted}
          className="w-full min-h-[60px] rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--foreground)]"
        />
      </div>

      {isRejected && collection.rejectionReason && (
        <div className="rounded-lg border border-[var(--error)]/30 bg-[var(--error)]/5 p-3">
          <p className="text-xs font-medium text-[var(--error)]">Motif du rejet</p>
          <p className="mt-1 text-sm text-[var(--foreground)]">{collection.rejectionReason}</p>
        </div>
      )}

      {isSubmitted && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--foreground)]">Motif de rejet (si rejet)</label>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Expliquez pourquoi cette collecte est rejetée..."
            className="w-full min-h-[60px] rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--foreground)]"
          />
        </div>
      )}
      
      <div className="flex justify-end gap-2 pt-2">
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Annuler
        </Button>
        {isReadOnly ? null : isSubmitted ? (
          <>
            <Button
              size="sm"
              variant="secondary"
              onClick={handleReject}
              disabled={rejectCollection.isPending || validateCollection.isPending}
            >
              Rejeter
            </Button>
            <Button
              size="sm"
              onClick={handleValidate}
              disabled={rejectCollection.isPending || validateCollection.isPending}
            >
              Valider
            </Button>
          </>
        ) : (
          <>
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
          </>
        )}
      </div>
    </div>
  );
}

export default function CollectionsPage() {
  const router = useRouter();
  const { notify } = useToast();
  const searchParams = useSearchParams();
  const employeeFromUrl = searchParams.get("employee") || "all";
  const startDateFromUrl = searchParams.get("startDate");
  const endDateFromUrl = searchParams.get("endDate");
  const settledFromUrl = searchParams.get("isSettled");
  const hasCustomRangeFromUrl = Boolean(startDateFromUrl && endDateFromUrl);

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(employeeFromUrl);
  const [settledFilter, setSettledFilter] = useState<string>(settledFromUrl || "all");
  const [periodValue, setPeriodValue] = useState<string>(hasCustomRangeFromUrl ? "custom" : "this_week");
  const [customDateRange, setCustomDateRange] = useState<{ from?: Date; to?: Date }>(() => {
    if (!hasCustomRangeFromUrl) return {};
    return {
      from: new Date(startDateFromUrl as string),
      to: new Date(endDateFromUrl as string),
    };
  });
  const [expandedCollectionId, setExpandedCollectionId] = useState<string | null>(null);
  
  // Fetch employees for selector
  const { data: employees = [] } = useEmployees({ status: "active" });
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
  
  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedEmployeeId !== "all") params.set("employee", selectedEmployeeId);
    if (periodValue === "custom" && customDateRange.from) {
      params.set("startDate", customDateRange.from.toISOString().slice(0, 10));
      if (customDateRange.to) {
        params.set("endDate", customDateRange.to.toISOString().slice(0, 10));
      }
    }
    if (settledFilter !== "all") params.set("isSettled", settledFilter);
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [selectedEmployeeId, settledFilter, periodValue, customDateRange, router]);

  // Fetch collections with date range
  const { data: collections = [], isLoading, error } = useCashCollections({ 
    startDate,
    endDate,
    employeeId: selectedEmployeeId === "all" ? undefined : selectedEmployeeId,
    isSettled: settledFilter === "all" ? undefined : settledFilter === "true",
  });
  
  const filteredCollections = collections;
  
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
                <SelectItem value="all">Tous les employés</SelectItem>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName} ({getRoleLabel(emp.role)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Select value={settledFilter} onValueChange={setSettledFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tous" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="false">Non réglés</SelectItem>
                <SelectItem value="true">Réglés</SelectItem>
              </SelectContent>
            </Select>
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
            <div className="w-auto space-y-1.5">
              <label className="text-xs font-medium text-[var(--muted-foreground)] block">
                Dates
              </label>
              <DateRangePicker
                value={customDateRange.from ? { from: customDateRange.from, to: customDateRange.to } : undefined}
                onValueChange={(range) => {
                  setCustomDateRange({ from: range?.from, to: range?.to });
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
                  <Fragment key={collection.id}>
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
                  {expandedCollectionId === collection.id && (
                    <TableRow key={`${collection.id}-expanded`}>
                      <TableCell colSpan={7}>
                        <PaymentForm
                          collection={collection}
                          onSave={() => setExpandedCollectionId(null)}
                          onCancel={() => setExpandedCollectionId(null)}
                        />
                      </TableCell>
                    </TableRow>
                  )}
                  </Fragment>
                ))
              )}
            </TableBody>
          </Table>
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
