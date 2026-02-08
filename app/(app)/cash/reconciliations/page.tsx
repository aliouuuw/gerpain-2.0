"use client";

import { useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/Card";
import { Badge } from "@/components/ui/badge";
import { DatePicker } from "@/components/ui/date-picker/DatePicker";
import { Select, type SelectOption } from "@/components/ui/select/Select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCashCollectionsOverview } from "@/lib/hooks/useCollections";
import { formatters } from "@/lib/utils";
import { AlertTriangle, ArrowRight, Calendar, CheckCircle2 } from "lucide-react";

type PeriodPreset = "this_week" | "this_month" | "last_15_days" | "custom";

interface Period {
  label: string;
  startDate: string;
  endDate: string;
}

function getPeriodDates(preset: PeriodPreset, customStart?: Date, customEnd?: Date): Period {
  const today = new Date();
  const formatDate = (d: Date) => d.toISOString().split("T")[0];

  switch (preset) {
    case "this_week": {
      const start = new Date(today);
      const dayOfWeek = today.getDay();
      // Adjust to Monday (0 = Sunday, 1 = Monday, so we need to subtract dayOfWeek-1)
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      start.setDate(today.getDate() - daysToMonday); // Start of week (Monday)
      return {
        label: "Cette semaine",
        startDate: formatDate(start),
        endDate: formatDate(today),
      };
    }
    case "this_month": {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      return {
        label: "Ce mois",
        startDate: formatDate(start),
        endDate: formatDate(today),
      };
    }
    case "last_15_days": {
      const start = new Date(today);
      start.setDate(today.getDate() - 15);
      return {
        label: "Derniers 15 jours",
        startDate: formatDate(start),
        endDate: formatDate(today),
      };
    }
    case "custom":
    default:
      return {
        label: customStart && customEnd
          ? `${formatDate(customStart)} – ${formatDate(customEnd)}`
          : "Période personnalisée",
        startDate: customStart ? formatDate(customStart) : formatDate(today),
        endDate: customEnd ? formatDate(customEnd) : formatDate(today),
      };
  }
}

export default function ReconciliationsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initialize from URL params or defaults
  const urlPeriod = searchParams.get("period") as PeriodPreset | null;
  const urlRole = searchParams.get("role") || "all";
  const urlSettled = searchParams.get("settled") || "all";

  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>(urlPeriod || "this_month");
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>();
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>();
  const [roleFilter, setRoleFilter] = useState<string>(urlRole);
  const [settledFilter, setSettledFilter] = useState<string>(urlSettled);

  const period = useMemo(
    () => getPeriodDates(periodPreset, customStartDate, customEndDate),
    [periodPreset, customStartDate, customEndDate]
  );

  // Build query params for overview
  const overviewParams = useMemo(() => {
    const params: {
      startDate?: string;
      endDate?: string;
      role?: string;
      isSettled?: boolean;
    } = {
      startDate: period.startDate,
      endDate: period.endDate,
    };

    if (roleFilter !== "all") {
      params.role = roleFilter;
    }

    if (settledFilter !== "all") {
      params.isSettled = settledFilter === "settled";
    }

    return params;
  }, [period, roleFilter, settledFilter]);

  const { data: overview, isLoading } = useCashCollectionsOverview(overviewParams);

  // Calculate totals
  const totals = useMemo(() => {
    if (!overview) return null;
    return {
      tournées: overview.reduce((sum, e) => sum + e.tournées, 0),
      totalExpected: overview.reduce((sum, e) => sum + e.totalExpected, 0),
      totalCollected: overview.reduce((sum, e) => sum + e.totalCollected, 0),
      solde: overview.reduce((sum, e) => sum + e.solde, 0),
    };
  }, [overview]);

  const handleRowClick = (employeeId: string) => {
    const params = new URLSearchParams();
    params.set("employee", employeeId);
    params.set("startDate", period.startDate);
    params.set("endDate", period.endDate);
    router.push(`/cash/collections?${params.toString()}`);
  };

  // Options for Select components
  const periodOptions: SelectOption[] = [
    { value: "this_week", label: "Cette semaine" },
    { value: "this_month", label: "Ce mois" },
    { value: "last_15_days", label: "Derniers 15 jours" },
    { value: "custom", label: "Personnalisée..." },
  ];

  const roleOptions: SelectOption[] = [
    { value: "all", label: "Tous" },
    { value: "delivery", label: "Livreurs" },
    { value: "cashier", label: "Caissiers" },
  ];

  const settledOptions: SelectOption[] = [
    { value: "all", label: "Tous" },
    { value: "unsettled", label: "Non réglés" },
    { value: "settled", label: "Réglés" },
  ];

  const formatCurrency = (amount: number) => {
    return formatters.currency({ number: amount, maxFractionDigits: 0, currency: "XOF" });
  };

  const getSoldeColor = (solde: number) => {
    if (solde < 0) return "text-red-600";
    if (solde === 0) return "text-green-600";
    return "text-amber-600"; // positive = overpayment
  };

  const getSoldeBg = (solde: number) => {
    if (solde < 0) return "bg-red-50";
    if (solde === 0) return "bg-green-50";
    return "bg-amber-50";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)]">
          Suivi des encaissements
        </h1>
        <p className="text-[var(--muted-foreground)]">
          Vue d&apos;ensemble par employé — qui doit de l&apos;argent cette période ?
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-end">
            {/* Period Selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Période</label>
              <Select
                value={periodPreset}
                onValueChange={(v) => setPeriodPreset(v as PeriodPreset)}
                options={periodOptions}
                placeholder="Sélectionner..."
                className="w-[200px]"
              />
            </div>

            {/* Custom Date Range */}
            {periodPreset === "custom" && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Du</label>
                  <DatePicker
                    value={customStartDate}
                    onValueChange={(v) => setCustomStartDate(v as Date | undefined)}
                    className="w-[160px]"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Au</label>
                  <DatePicker
                    value={customEndDate}
                    onValueChange={(v) => setCustomEndDate(v as Date | undefined)}
                    className="w-[160px]"
                  />
                </div>
              </>
            )}

            {/* Role Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Rôle</label>
              <Select
                value={roleFilter}
                onValueChange={(v) => setRoleFilter(v as string)}
                options={roleOptions}
                placeholder="Tous"
                className="w-[140px]"
              />
            </div>

            {/* Settled Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Statut</label>
              <Select
                value={settledFilter}
                onValueChange={(v) => setSettledFilter(v as string)}
                options={settledOptions}
                placeholder="Tous"
                className="w-[160px]"
              />
            </div>

            {/* Period Label Display */}
            <div className="flex-1 text-right flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[var(--muted-foreground)]" />
              <span className="text-sm text-[var(--muted-foreground)]">
                {period.label}: {period.startDate} – {period.endDate}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overview Table */}
      <Card>
        <CardHeader>
          <CardTitle>Récapitulatif par employé</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-[var(--muted-foreground)]">Chargement...</p>
            </div>
          ) : !overview || overview.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[var(--muted-foreground)] mb-2">
                Aucune donnée pour cette période
              </p>
              <p className="text-sm text-[var(--muted-foreground)]">
                Les employés n&apos;ont pas de collectes enregistrées pour les filtres sélectionnés.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employé</TableHead>
                    <TableHead>Rôle</TableHead>
                    <TableHead className="text-right">Tournées</TableHead>
                    <TableHead className="text-right">Attendu</TableHead>
                    <TableHead className="text-right">Collecté</TableHead>
                    <TableHead className="text-right">Solde</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overview.map((employee) => (
                    <TableRow
                      key={employee.employeeId}
                      className="cursor-pointer hover:bg-[var(--accent)]"
                      onClick={() => handleRowClick(employee.employeeId)}
                    >
                      <TableCell className="font-medium">
                        {employee.employeeName}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={employee.role === "delivery" ? "default" : "info"}
                          className="text-xs"
                        >
                          {employee.roleLabel}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{employee.tournées}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(employee.totalExpected)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(employee.totalCollected)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded ${getSoldeBg(employee.solde)}`}>
                          {employee.solde < 0 && (
                            <AlertTriangle className="w-4 h-4 text-red-600" />
                          )}
                          {employee.solde === 0 && (
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                          )}
                          <span className={`font-medium ${getSoldeColor(employee.solde)}`}>
                            {formatCurrency(Math.abs(employee.solde))}
                            {employee.solde !== 0 && (
                              <span className="text-xs ml-1">
                                {employee.solde < 0 ? "(doit)" : "(excès)"}
                              </span>
                            )}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <ArrowRight className="w-4 h-4 text-[var(--muted-foreground)]" />
                      </TableCell>
                    </TableRow>
                  ))}

                  {/* Total Row */}
                  {totals && (
                    <TableRow className="font-semibold bg-[var(--muted)]/50">
                      <TableCell colSpan={2}>Total</TableCell>
                      <TableCell className="text-right">{totals.tournées}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(totals.totalExpected)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(totals.totalCollected)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={getSoldeColor(totals.solde)}>
                          {formatCurrency(totals.solde)}
                        </span>
                      </TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-sm text-[var(--muted-foreground)]">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-100" />
          <span>Solde négatif = employé doit de l&apos;argent</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-100" />
          <span>Solde zéro = tout est réglé</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-amber-100" />
          <span>Solde positif = excès de versement</span>
        </div>
      </div>
    </div>
  );
}

