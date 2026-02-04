"use client";

import { useState } from "react";
import { Button } from "@/components/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/Card";
import { Input } from "@/components/Input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableEmptyState } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Minus, Package, AlertTriangle, TrendingDown, Archive } from "lucide-react";
import { useStockLevels, useAdjustStock, useDeleteInventoryItem } from "@/lib/hooks/useInventory";
import { useProducts } from "@/lib/hooks/useProducts";
import { useLocations } from "@/lib/hooks/useLocations";
import { Select } from "@/components/ui/select/Select";
import type { InventoryItem } from "@/lib/api/inventory";

const statusConfig = {
  normal: { label: "Normal", variant: "default" as const, icon: Package, color: "text-green-600" },
  low: { label: "Faible", variant: "warning" as const, icon: TrendingDown, color: "text-yellow-600" },
  critical: { label: "Critique", variant: "error" as const, icon: AlertTriangle, color: "text-red-600" },
  out: { label: "Rupture", variant: "error" as const, icon: Archive, color: "text-gray-500" },
};

function StockAdjustmentDialog({
  item,
  onAdjust,
  type,
  children,
}: {
  item: InventoryItem;
  onAdjust: (adjustment: number, reason: string) => void;
  type: "in" | "out";
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");

  const handleSubmit = () => {
    if (!quantity) return;
    const adjustment = type === "in" ? parseInt(quantity) : -parseInt(quantity);
    onAdjust(adjustment, reason);
    setOpen(false);
    setQuantity("");
    setReason("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{type === "in" ? "Entrée de stock" : "Sortie de stock"}</DialogTitle>
          <DialogDescription>
            {type === "in" 
              ? "Ajoutez des unités au stock actuel." 
              : "Retirez des unités du stock actuel."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium">Quantité</label>
            <Input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Ex: 10"
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Raison (optionnel)</label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Livraison, Ajustement..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={!quantity || parseInt(quantity) <= 0}>
            {type === "in" ? "Ajouter" : "Retirer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function StockLevelsPage() {
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [showLowStock, setShowLowStock] = useState(false);
  const { data: stockData, isLoading } = useStockLevels(selectedLocation || undefined, undefined, showLowStock || undefined);
  const { data: products } = useProducts();
  const { data: locations } = useLocations();
  const adjustStock = useAdjustStock();
  const deleteItem = useDeleteInventoryItem();

  const getProductName = (productId: string) => {
    return products?.find(p => p.id === productId)?.name ?? "Produit inconnu";
  };

  const getLocationName = (locationId: string) => {
    return locations?.find(l => l.id === locationId)?.name ?? "Point de vente inconnu";
  };

  const handleAdjust = (itemId: string, adjustment: number, reason: string) => {
    adjustStock.mutate({ id: itemId, data: { adjustment, reason } });
  };

  const summary = stockData?.summary ?? { totalItems: 0, criticalItems: 0, lowItems: 0, outOfStock: 0 };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Niveaux de stock</h1>
          <p className="text-muted-foreground">Vue d'ensemble des stocks par point de vente</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total articles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalItems}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-600">Stock critique</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{summary.criticalItems}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-yellow-600">Stock faible</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{summary.lowItems}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Rupture de stock</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-500">{summary.outOfStock}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Select
          value={selectedLocation}
          onValueChange={(val) => setSelectedLocation(val as string)}
          placeholder="Tous les points de vente"
          options={[
            { value: "", label: "Tous les points de vente" },
            ...(locations?.map((l) => ({ value: l.id, label: l.name })) ?? []),
          ]}
          className="w-[250px]"
        />
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showLowStock}
            onChange={(e) => setShowLowStock(e.target.checked)}
            className="rounded border-gray-300"
          />
          <span className="text-sm">Afficher uniquement les stocks faibles</span>
        </label>
      </div>

      {/* Stock Table */}
      <Card>
        <CardHeader>
          <CardTitle>État des stocks</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produit</TableHead>
                <TableHead>Point de vente</TableHead>
                <TableHead>Stock actuel</TableHead>
                <TableHead>Disponible</TableHead>
                <TableHead>Seuil alerte</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="w-[150px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Chargement...
                  </TableCell>
                </TableRow>
              ) : stockData?.data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    <TableEmptyState colSpan={7} message="Aucun article en stock" />
                  </TableCell>
                </TableRow>
              ) : (
                stockData?.data.map((item) => {
                  const status = statusConfig[item.status];
                  const StatusIcon = status.icon;
                  
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{getProductName(item.productId)}</TableCell>
                      <TableCell>{getLocationName(item.locationId)}</TableCell>
                      <TableCell>{item.currentQuantity}</TableCell>
                      <TableCell>{item.availableQuantity}</TableCell>
                      <TableCell>{item.reorderPoint > 0 ? item.reorderPoint : "—"}</TableCell>
                      <TableCell>
                        <div className={`flex items-center gap-1.5 ${status.color}`}>
                          <StatusIcon className="h-4 w-4" />
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <StockAdjustmentDialog
                            item={item}
                            type="in"
                            onAdjust={(adj, reason) => handleAdjust(item.id, adj, reason)}
                          >
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600">
                              <Plus className="h-4 w-4" />
                            </Button>
                          </StockAdjustmentDialog>
                          <StockAdjustmentDialog
                            item={item}
                            type="out"
                            onAdjust={(adj, reason) => handleAdjust(item.id, adj, reason)}
                          >
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600">
                              <Minus className="h-4 w-4" />
                            </Button>
                          </StockAdjustmentDialog>
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
