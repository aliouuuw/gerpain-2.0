"use client";

import { useState } from "react";
import { Plus, Search, Building2, Pencil, Trash2, Phone, MapPin, AlertCircle } from "lucide-react";

import { Button } from "@/components/Button";
import { Card, CardContent, CardHeader } from "@/components/Card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableEmptyState } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { useBakeries, useCreateBakery, useUpdateBakery, useDeleteBakery, useBakeryTierStatus } from "@/lib/hooks/useBakeries";
import type { Bakery } from "@/lib/api/bakeries";

const emptyFormData = {
  name: "",
  code: "",
  address: "",
  phone: "",
};

export default function BakeriesPage() {
  const { notify } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBakery, setEditingBakery] = useState<Bakery | null>(null);
  const [formData, setFormData] = useState(emptyFormData);
  const [deleteConfirm, setDeleteConfirm] = useState<Bakery | null>(null);

  const { data: bakeries = [], isLoading, error } = useBakeries();
  const { data: tierStatus } = useBakeryTierStatus();
  const createBakery = useCreateBakery();
  const updateBakery = useUpdateBakery();
  const deleteBakery = useDeleteBakery();

  const filteredBakeries = bakeries.filter((bakery) => {
    const matchesSearch =
      searchQuery === "" ||
      bakery.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bakery.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (bakery.address && bakery.address.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch;
  });

  const canCreate = tierStatus ? tierStatus.current < tierStatus.limit : false;

  const openAddForm = () => {
    setEditingBakery(null);
    setFormData(emptyFormData);
    setIsFormOpen(true);
  };

  const openEditForm = (bakery: Bakery) => {
    setEditingBakery(bakery);
    setFormData({
      name: bakery.name,
      code: bakery.code,
      address: bakery.address || "",
      phone: bakery.phone || "",
    });
    setIsFormOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      notify({
        variant: "error",
        title: "Erreur",
        description: "Le nom de la boulangerie est requis.",
      });
      return;
    }

    if (!formData.code.trim()) {
      notify({
        variant: "error",
        title: "Erreur",
        description: "Le code de la boulangerie est requis.",
      });
      return;
    }

    try {
      if (editingBakery) {
        await updateBakery.mutateAsync({
          id: editingBakery.id,
          data: {
            name: formData.name,
            code: formData.code,
            address: formData.address || undefined,
            phone: formData.phone || undefined,
          },
        });
        notify({
          variant: "success",
          title: "Succès",
          description: "Boulangerie mise à jour avec succès.",
        });
      } else {
        await createBakery.mutateAsync({
          name: formData.name,
          code: formData.code,
          address: formData.address || undefined,
          phone: formData.phone || undefined,
        });
        notify({
          variant: "success",
          title: "Succès",
          description: "Boulangerie créée avec succès.",
        });
      }
      setIsFormOpen(false);
      setFormData(emptyFormData);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Une erreur est survenue";
      notify({
        variant: "error",
        title: "Erreur",
        description: message,
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;

    try {
      await deleteBakery.mutateAsync(deleteConfirm.id);
      notify({
        variant: "success",
        title: "Succès",
        description: "Boulangerie supprimée avec succès.",
      });
      setDeleteConfirm(null);
    } catch {
      notify({
        variant: "error",
        title: "Erreur",
        description: "Impossible de supprimer la boulangerie.",
      });
    }
  };

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)]">
          Boulangeries
        </h1>
        <p className="text-[var(--muted-foreground)]">
          Gérez vos boulangeries et leurs paramètres.
        </p>
      </div>

      {tierStatus && (
        <Card className="border-l-4 border-l-[var(--warning)]">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertCircle className="size-5 text-[var(--warning)]" />
            <div>
              <p className="font-medium">
                Limite de boulangeries: {tierStatus.current} / {tierStatus.limit}
              </p>
              <p className="text-sm text-[var(--muted-foreground)]">
                {tierStatus.current >= tierStatus.limit
                  ? "Vous avez atteint la limite maximale de boulangeries."
                  : `Il vous reste ${tierStatus.limit - tierStatus.current} boulangerie(s) disponible(s).`}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
            <input
              type="text"
              placeholder="Rechercher une boulangerie..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] py-2 pl-10 pr-4 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
            />
          </div>
          <Button
            onClick={openAddForm}
            disabled={!canCreate}
            className="shrink-0"
          >
            <Plus className="mr-2 size-4" />
            Nouvelle boulangerie
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="size-8 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent" />
            </div>
          ) : error ? (
            <div className="py-12 text-center">
              <p className="text-[var(--error)]">Erreur lors du chargement des boulangeries.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Boulangerie</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Adresse</TableHead>
                  <TableHead>Téléphone</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBakeries.length === 0 ? (
                  <TableEmptyState
                    colSpan={5}
                    icon={<Building2 className="size-8" />}
                    message={
                      searchQuery
                        ? "Aucune boulangerie ne correspond à votre recherche."
                        : "Commencez par créer une boulangerie."
                    }
                    action={
                      !searchQuery && canCreate ? (
                        <Button variant="outline" onClick={openAddForm}>
                          <Plus className="mr-2 size-4" />
                          Créer une boulangerie
                        </Button>
                      ) : undefined
                    }
                  />
                ) : (
                  filteredBakeries.map((bakery) => (
                    <TableRow key={bakery.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex size-8 items-center justify-center rounded-full bg-[var(--secondary)]">
                            <Building2 className="size-4 text-[var(--muted-foreground)]" />
                          </div>
                          <div>
                            <p className="font-medium">{bakery.name}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="default">{bakery.code}</Badge>
                      </TableCell>
                      <TableCell>
                        {bakery.address ? (
                          <div className="flex items-center gap-1 text-sm text-[var(--muted-foreground)]">
                            <MapPin className="size-3" />
                            {bakery.address}
                          </div>
                        ) : (
                          <span className="text-sm text-[var(--muted-foreground)]">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {bakery.phone ? (
                          <div className="flex items-center gap-1 text-sm text-[var(--muted-foreground)]">
                            <Phone className="size-3" />
                            {bakery.phone}
                          </div>
                        ) : (
                          <span className="text-sm text-[var(--muted-foreground)]">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEditForm(bakery)}
                            className="rounded-md p-2 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--secondary)] hover:text-[var(--foreground)]"
                          >
                            <Pencil className="size-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(bakery)}
                            className="rounded-md p-2 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--error-subtle)] hover:text-[var(--error)]"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingBakery ? "Modifier la boulangerie" : "Nouvelle boulangerie"}
            </DialogTitle>
            <DialogDescription>
              {editingBakery
                ? "Modifiez les informations de la boulangerie."
                : "Créez une nouvelle boulangerie pour votre organisation."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nom</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Boulangerie Centre"
                className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Code</label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="Ex: BC"
                className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Adresse</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Ex: 12 Rue Principale, Dakar"
                className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Téléphone</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Ex: +221 33 123 45 67"
                className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSubmit}>
              {editingBakery ? "Enregistrer" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer la boulangerie &quot;{deleteConfirm?.name}&quot; ?
              Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
