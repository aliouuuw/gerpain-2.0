"use client";

import { useState } from "react";
import { Button } from "@/components/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/Card";
import { Input } from "@/components/Input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableEmptyState } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Tag } from "lucide-react";
import { usePricingRules, useCreatePricingRule, useUpdatePricingRule, useDeletePricingRule } from "@/lib/hooks/usePricing";
import { useProducts } from "@/lib/hooks/useProducts";
import { useLocations } from "@/lib/hooks/useLocations";
import type { PricingRule } from "@/lib/api/pricing";

function formatPrice(cents: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "XOF",
    minimumFractionDigits: 0,
  }).format(cents);
}

function PricingRuleDialog({
  rule,
  onSave,
  children,
}: {
  rule?: PricingRule;
  onSave: (data: { productId: string; locationId: string; unitPrice: number }) => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [productId, setProductId] = useState(rule?.productId ?? "");
  const [locationId, setLocationId] = useState(rule?.locationId ?? "");
  const [unitPrice, setUnitPrice] = useState(rule?.unitPrice ? (rule.unitPrice / 100).toString() : "");
  const { data: products } = useProducts();
  const { data: locations } = useLocations();

  const handleSave = () => {
    if (!productId || !locationId || !unitPrice) return;
    const priceInCents = Math.round(parseFloat(unitPrice) * 100);
    onSave({
      productId,
      locationId,
      unitPrice: priceInCents,
    });
    setOpen(false);
    if (!rule) {
      setProductId("");
      setLocationId("");
      setUnitPrice("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{rule ? "Modifier le tarif" : "Nouveau tarif"}</DialogTitle>
          <DialogDescription>
            {rule
              ? "Modifiez le prix spécifique pour ce produit et point de vente."
              : "Définissez un prix spécifique pour un produit à un point de vente."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <label htmlFor="product" className="text-sm font-medium">Produit</label>
            <select
              id="product"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              disabled={!!rule}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
            >
              <option value="">Sélectionner un produit</option>
              {products?.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <label htmlFor="location" className="text-sm font-medium">Point de vente</label>
            <select
              id="location"
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              disabled={!!rule}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
            >
              <option value="">Sélectionner un point de vente</option>
              {locations?.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <label htmlFor="price" className="text-sm font-medium">Prix spécifique (XOF)</label>
            <Input
              id="price"
              type="number"
              min="0"
              step="0.01"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              placeholder="Ex: 200"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={!productId || !locationId || !unitPrice}>
            {rule ? "Enregistrer" : "Créer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteDialog({ rule, onDelete }: { rule: PricingRule; onDelete: () => void }) {
  const [open, setOpen] = useState(false);

  const handleDelete = () => {
    onDelete();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
          <Trash2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Supprimer le tarif</DialogTitle>
          <DialogDescription>
            Êtes-vous sûr de vouloir supprimer ce tarif spécifique ? Cette action est irréversible.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            Supprimer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function PricingPage() {
  const { data: rules, isLoading } = usePricingRules();
  const { data: products } = useProducts();
  const { data: locations } = useLocations();
  const createRule = useCreatePricingRule();
  const updateRule = useUpdatePricingRule();
  const deleteRule = useDeletePricingRule();

  const getProductName = (productId: string) => {
    return products?.find(p => p.id === productId)?.name ?? "Produit inconnu";
  };

  const getLocationName = (locationId: string) => {
    return locations?.find(l => l.id === locationId)?.name ?? "Point de vente inconnu";
  };

  const getBasePrice = (productId: string) => {
    return products?.find(p => p.id === productId)?.unitPrice ?? 0;
  };

  const handleCreate = (data: { productId: string; locationId: string; unitPrice: number }) => {
    createRule.mutate(data);
  };

  const handleUpdate = (id: string, data: { unitPrice: number }) => {
    updateRule.mutate({ id, data });
  };

  const handleDelete = (id: string) => {
    deleteRule.mutate(id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tarifs spécifiques</h1>
          <p className="text-muted-foreground">Gérez les prix par point de vente</p>
        </div>
        <PricingRuleDialog onSave={handleCreate}>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nouveau tarif
          </Button>
        </PricingRuleDialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Liste des tarifs spécifiques</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produit</TableHead>
                <TableHead>Point de vente</TableHead>
                <TableHead>Prix de base</TableHead>
                <TableHead>Prix spécifique</TableHead>
                <TableHead>Différence</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Chargement...
                  </TableCell>
                </TableRow>
              ) : rules?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    <TableEmptyState colSpan={7} message="Aucun tarif spécifique défini" />
                  </TableCell>
                </TableRow>
              ) : (
                rules?.map((rule) => {
                  const basePrice = getBasePrice(rule.productId);
                  const diff = rule.unitPrice - basePrice;
                  const diffPercent = basePrice > 0 ? Math.round((diff / basePrice) * 100) : 0;
                  
                  return (
                    <TableRow key={rule.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Tag className="h-4 w-4 text-muted-foreground" />
                          {getProductName(rule.productId)}
                        </div>
                      </TableCell>
                      <TableCell>{getLocationName(rule.locationId)}</TableCell>
                      <TableCell>{formatPrice(basePrice)}</TableCell>
                      <TableCell className="font-medium">{formatPrice(rule.unitPrice)}</TableCell>
                      <TableCell>
                        {diff !== 0 ? (
                          <span className={diff > 0 ? "text-green-600" : "text-red-600"}>
                            {diff > 0 ? "+" : ""}{formatPrice(diff)} ({diff > 0 ? "+" : ""}{diffPercent}%)
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={rule.isActive ? "default" : "default"} className={rule.isActive ? "" : "bg-gray-100 text-gray-600"}>
                          {rule.isActive ? "Actif" : "Inactif"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <PricingRuleDialog
                            rule={rule}
                            onSave={(data) => handleUpdate(rule.id, { unitPrice: data.unitPrice })}
                          >
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </PricingRuleDialog>
                          <DeleteDialog rule={rule} onDelete={() => handleDelete(rule.id)} />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
