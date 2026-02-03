"use client";

import { useState } from "react";
import { Plus, Search, MapPin, Building2, Store, Warehouse, Pencil, Trash2, Phone } from "lucide-react";

import { Button } from "@/components/Button";
import { Card, CardContent, CardHeader } from "@/components/Card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableEmptyState } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, type SelectOption } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { useLocations, useCreateLocation, useUpdateLocation, useDeleteLocation } from "@/lib/hooks/useLocations";
import type { Location, LocationType } from "@/lib/api/locations";

const typeLabels: Record<LocationType, string> = {
  bakery: "Boulangerie",
  shop: "Point de vente",
  warehouse: "Dépôt",
};

const typeIcons: Record<LocationType, React.ReactNode> = {
  bakery: <Building2 className="size-4" />,
  shop: <Store className="size-4" />,
  warehouse: <Warehouse className="size-4" />,
};

const typeOptions: SelectOption[] = [
  { value: "all", label: "Tous les types" },
  { value: "bakery", label: "Boulangerie" },
  { value: "shop", label: "Point de vente" },
  { value: "warehouse", label: "Dépôt" },
];

const emptyFormData = {
  name: "",
  type: "shop" as LocationType,
  address: "",
  phone: "",
};

export default function LocationsPage() {
  const { notify } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [formData, setFormData] = useState(emptyFormData);
  const [deleteConfirm, setDeleteConfirm] = useState<Location | null>(null);

  const { data: locations = [], isLoading, error } = useLocations();
  const createLocation = useCreateLocation();
  const updateLocation = useUpdateLocation();
  const deleteLocation = useDeleteLocation();

  const filteredLocations = locations.filter((loc) => {
    const matchesSearch =
      searchQuery === "" ||
      loc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (loc.address && loc.address.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesType = typeFilter === "all" || loc.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const openAddForm = () => {
    setEditingLocation(null);
    setFormData(emptyFormData);
    setIsFormOpen(true);
  };

  const openEditForm = (location: Location) => {
    setEditingLocation(location);
    setFormData({
      name: location.name,
      type: location.type,
      address: location.address || "",
      phone: location.phone || "",
    });
    setIsFormOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      notify({
        variant: "error",
        title: "Erreur",
        description: "Le nom de la localisation est requis.",
      });
      return;
    }

    try {
      if (editingLocation) {
        await updateLocation.mutateAsync({
          id: editingLocation.id,
          data: {
            name: formData.name,
            type: formData.type,
            address: formData.address || undefined,
            phone: formData.phone || undefined,
          },
        });
      } else {
        await createLocation.mutateAsync({
          name: formData.name,
          type: formData.type,
          address: formData.address || undefined,
          phone: formData.phone || undefined,
        });
      }

      setIsFormOpen(false);
      setEditingLocation(null);
      setFormData(emptyFormData);
    } catch (error) {
      console.error("Failed to save location:", error);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;

    try {
      await deleteLocation.mutateAsync(deleteConfirm.id);
      setDeleteConfirm(null);
    } catch (error) {
      console.error("Failed to delete location:", error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">
            Localisations
          </h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Gérez vos boulangeries, points de vente et dépôts
          </p>
        </div>
        <Button onClick={openAddForm}>
          <Plus className="size-4" />
          Ajouter une localisation
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher par nom ou adresse..."
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] py-2 pl-10 pr-4 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
              />
            </div>
            <Select
              value={typeFilter}
              onValueChange={(val) => setTypeFilter(Array.isArray(val) ? val[0] : val)}
              options={typeOptions}
              placeholder="Type"
              className="w-44"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow variant="header">
                <TableHead>Localisation</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Adresse</TableHead>
                <TableHead>Téléphone</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableEmptyState
                  colSpan={6}
                  message="Chargement des localisations..."
                />
              ) : error ? (
                <TableEmptyState
                  colSpan={6}
                  message="Erreur lors du chargement des localisations"
                  action={
                    <Button size="sm" variant="secondary" onClick={() => window.location.reload()}>
                      Réessayer
                    </Button>
                  }
                />
              ) : filteredLocations.length === 0 ? (
                <TableEmptyState
                  colSpan={6}
                  message="Aucune localisation trouvée"
                  action={
                    <Button size="sm" variant="secondary" onClick={openAddForm}>
                      Ajouter une localisation
                    </Button>
                  }
                />
              ) : (
                filteredLocations.map((loc) => (
                  <TableRow key={loc.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-full bg-[var(--primary-subtle)] text-[var(--primary)]">
                          <MapPin className="size-5" />
                        </div>
                        <p className="font-medium text-[var(--foreground)]">{loc.name}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="info" className="inline-flex items-center gap-1">
                        {typeIcons[loc.type]}
                        {typeLabels[loc.type]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {loc.address ? (
                        <span className="text-sm text-[var(--muted-foreground)]">{loc.address}</span>
                      ) : (
                        <span className="text-sm text-[var(--muted-foreground)] italic">Non renseignée</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {loc.phone ? (
                        <span className="flex items-center gap-1 text-sm text-[var(--muted-foreground)]">
                          <Phone className="size-3" />
                          {loc.phone}
                        </span>
                      ) : (
                        <span className="text-sm text-[var(--muted-foreground)] italic">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={loc.isActive ? "success" : "default"}>
                        {loc.isActive ? "Actif" : "Inactif"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEditForm(loc)}
                          aria-label="Modifier"
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeleteConfirm(loc)}
                          aria-label="Supprimer"
                          disabled={deleteLocation.isPending}
                        >
                          <Trash2 className="size-4 text-[var(--error)]" />
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

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingLocation ? "Modifier la localisation" : "Ajouter une localisation"}
            </DialogTitle>
            <DialogDescription>
              {editingLocation
                ? `Modification de ${editingLocation.name}`
                : "Renseignez les informations de la nouvelle localisation"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)]">
                Nom *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                className="mt-1.5 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                placeholder="Nom de la localisation"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--foreground)]">
                Type
              </label>
              <Select
                value={formData.type}
                onValueChange={(val) =>
                  setFormData((prev) => ({
                    ...prev,
                    type: (Array.isArray(val) ? val[0] : val) as LocationType,
                  }))
                }
                options={typeOptions.filter((o) => o.value !== "all")}
                className="mt-1.5"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--foreground)]">
                Adresse
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
                className="mt-1.5 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                placeholder="123 Rue de la Boulangerie, Dakar"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--foreground)]">
                Téléphone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                className="mt-1.5 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                placeholder="+221 77 123 45 67"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsFormOpen(false)} disabled={createLocation.isPending || updateLocation.isPending}>
              Annuler
            </Button>
            <Button onClick={handleSubmit} disabled={createLocation.isPending || updateLocation.isPending}>
              {createLocation.isPending || updateLocation.isPending
                ? "Enregistrement..."
                : editingLocation
                  ? "Enregistrer"
                  : "Ajouter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Supprimer la localisation</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer <strong>{deleteConfirm?.name}</strong> ? Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteLocation.isPending}>
              {deleteLocation.isPending ? "Suppression..." : "Supprimer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
