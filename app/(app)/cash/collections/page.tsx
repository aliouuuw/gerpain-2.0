"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/Button";
import { Card, CardContent, CardHeader } from "@/components/Card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableEmptyState } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DatePicker } from "@/components/ui/date-picker";
import { useToast } from "@/components/ui/toast";
import { useCashCollections } from "@/lib/hooks/useCollections";

function getStatusLabel(status: string) {
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

function getStatusVariant(status: string) {
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

function formatCurrency(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "XOF",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
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

  // Fetch collections for the selected date
  const { data: collections = [], isLoading, error } = useCashCollections({ date });

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
            Collectes de caisse
          </h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Enregistrez les dépôts en fin de service
          </p>
        </div>
        <Button onClick={() => notify({ title: "Fonctionnalité à venir", description: "La création de collecte sera bientôt disponible" })}>
          <Plus className="size-4" />
          Nouvelle collecte
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Collectes du jour</h2>
              <p className="text-sm text-[var(--muted-foreground)]">
                {collections.length} collecte{collections.length !== 1 ? "s" : ""} enregistrée{collections.length !== 1 ? "s" : ""}
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
                <TableHead>Employé</TableHead>
                <TableHead>Route</TableHead>
                <TableHead numeric>Attendu</TableHead>
                <TableHead numeric>Réel</TableHead>
                <TableHead numeric>Écart</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableEmptyState
                  colSpan={7}
                  message="Chargement des collectes..."
                />
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
              ) : collections.length === 0 ? (
                <TableEmptyState
                  colSpan={7}
                  message="Aucune collecte pour cette date"
                  action={
                    <Button size="sm" variant="secondary" onClick={() => notify({ title: "Fonctionnalité à venir" })}>
                      Créer une collecte
                    </Button>
                  }
                />
              ) : (
                collections.map((collection) => (
                  <TableRow key={collection.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-[var(--foreground)]">{collection.employeeName}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-[var(--muted-foreground)]">
                        {collection.routeLabel}
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
                        <span className={`font-medium ${getVarianceClass(collection.variance, collection.expectedAmount)}`}>
                          {collection.variance >= 0 ? "+" : ""}
                          {formatCurrency(collection.variance)}
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
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => notify({ title: "Détails", description: `Collecte ${collection.id}` })}
                        >
                          {collection.status === "pending" ? "Saisir" : "Voir détails"}
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

      {collections.length > 0 && (
        <Card variant="ghost" className="border border-dashed">
          <CardContent className="py-8 text-center">
            <p className="text-sm text-[var(--muted-foreground)]">
              💡 Cliquez sur &quot;Saisir&quot; pour enregistrer les montants collectés (espèces, carte, mobile money)
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
