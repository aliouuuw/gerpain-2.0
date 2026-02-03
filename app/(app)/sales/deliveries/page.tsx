"use client";

import React, { useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/Button";
import { Card, CardContent, CardHeader } from "@/components/Card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmptyState } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DatePicker } from "@/components/ui/date-picker";
import { useToast } from "@/components/ui/toast";
import { useDeliveryRuns } from "@/lib/hooks/useDeliveries";

function getStatusLabel(status: string) {
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

function getStatusVariant(status: string) {
  switch (status) {
    case "draft":
      return "default" as const;
    case "in_progress":
      return "warning" as const;
    case "validated":
      return "success" as const;
    default:
      return "default" as const;
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

export default function DeliveriesPage() {
  const { notify } = useToast();
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10));

  // Fetch delivery runs for the selected date
  const { data: runs = [], isLoading, error } = useDeliveryRuns({ date });

  const handleDateChange = (value: Date | { from: Date; to?: Date } | undefined) => {
    if (value instanceof Date) {
      setDate(value.toISOString().slice(0, 10));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">
            Tournées de livraison
          </h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Gérez les sorties de marchandises et les retours
          </p>
        </div>
        <Button onClick={() => notify({ title: "Fonctionnalité à venir", description: "La création de tournée sera bientôt disponible" })}>
          <Plus className="size-4" />
          Nouvelle tournée
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Tournées du jour</h2>
              <p className="text-sm text-[var(--muted-foreground)]">
                {runs.length} tournée{runs.length !== 1 ? "s" : ""} enregistrée{runs.length !== 1 ? "s" : ""}
              </p>
            </div>
            <DatePicker
              value={date ? new Date(date) : undefined}
              onValueChange={handleDateChange}
              placeholder="Choisir une date"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow variant="header">
                <TableHead>Livreur</TableHead>
                <TableHead>Localisation</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Articles</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableEmptyState
                  colSpan={6}
                  message="Chargement des tournées..."
                />
              ) : error ? (
                <TableEmptyState
                  colSpan={6}
                  message="Erreur lors du chargement des tournées"
                  action={
                    <Button size="sm" variant="secondary" onClick={() => window.location.reload()}>
                      Réessayer
                    </Button>
                  }
                />
              ) : runs.length === 0 ? (
                <TableEmptyState
                  colSpan={6}
                  message="Aucune tournée pour cette date"
                  action={
                    <Button size="sm" variant="secondary" onClick={() => notify({ title: "Fonctionnalité à venir" })}>
                      Créer une tournée
                    </Button>
                  }
                />
              ) : (
                runs.map((run) => (
                  <TableRow key={run.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-[var(--foreground)]">{run.employeeName}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-[var(--muted-foreground)]">
                        {run.locationId}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-[var(--muted-foreground)]">
                        {new Date(run.date).toLocaleDateString("fr-FR")}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-[var(--muted-foreground)]">
                        {run.items?.length || 0} article{run.items?.length !== 1 ? "s" : ""}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(run.status)}>
                        {getStatusLabel(run.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => notify({ title: "Détails", description: `Tournée ${run.id}` })}
                        >
                          Voir détails
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {runs.length > 0 && (
        <Card variant="ghost" className="border border-dashed">
          <CardContent className="py-8 text-center">
            <p className="text-sm text-[var(--muted-foreground)]">
              💡 Cliquez sur &quot;Voir détails&quot; pour gérer les articles, quantités et retours d&apos;une tournée
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
