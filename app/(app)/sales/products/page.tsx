"use client";

import { useState } from "react";
import { Button } from "@/components/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/Card";
import { Input } from "@/components/Input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableEmptyState } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Search, Package } from "lucide-react";
import { useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct } from "@/lib/hooks/useProducts";
import { useCategories } from "@/lib/hooks/useCategories";
import type { Product } from "@/lib/api/products";

function formatPrice(cents: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "XOF",
    minimumFractionDigits: 0,
  }).format(cents);
}

function ProductDialog({
  product,
  onSave,
  children,
}: {
  product?: Product;
  onSave: (data: { name: string; unitPrice: number; categoryId?: string; description?: string }) => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(product?.name ?? "");
  const [unitPrice, setUnitPrice] = useState(product?.unitPrice ? (product.unitPrice / 100).toString() : "");
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const { data: categories } = useCategories();

  const handleSave = () => {
    if (!name.trim() || !unitPrice) return;
    const priceInCents = Math.round(parseFloat(unitPrice) * 100);
    onSave({
      name: name.trim(),
      unitPrice: priceInCents,
      categoryId: categoryId || undefined,
      description: description.trim() || undefined,
    });
    setOpen(false);
    if (!product) {
      setName("");
      setUnitPrice("");
      setCategoryId("");
      setDescription("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{product ? "Modifier le produit" : "Nouveau produit"}</DialogTitle>
          <DialogDescription>
            {product
              ? "Modifiez les informations du produit."
              : "Créez un nouveau produit pour votre catalogue."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <label htmlFor="name" className="text-sm font-medium">Nom</label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Baguette tradition"
            />
          </div>
          <div className="grid gap-2">
            <label htmlFor="price" className="text-sm font-medium">Prix (XOF)</label>
            <Input
              id="price"
              type="number"
              min="0"
              step="0.01"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              placeholder="Ex: 150"
            />
          </div>
          <div className="grid gap-2">
            <label htmlFor="category" className="text-sm font-medium">Catégorie</label>
            <select
              id="category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Sans catégorie</option>
              {categories?.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <label htmlFor="description" className="text-sm font-medium">Description</label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Pain de tradition française"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={!name.trim() || !unitPrice}>
            {product ? "Enregistrer" : "Créer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteDialog({ product, onDelete }: { product: Product; onDelete: () => void }) {
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
          <DialogTitle>Supprimer le produit</DialogTitle>
          <DialogDescription>
            Êtes-vous sûr de vouloir supprimer &quot;{product.name}&quot; ? Cette action est irréversible.
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

export default function ProductsPage() {
  const { data: products, isLoading } = useProducts();
  const { data: categories } = useCategories();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");

  const filteredProducts = products?.filter(
    (p) => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter ? p.categoryId === categoryFilter : true;
      return matchesSearch && matchesCategory;
    }
  );

  const getCategoryName = (categoryId?: string) => {
    if (!categoryId) return null;
    return categories?.find(c => c.id === categoryId)?.name;
  };

  const getCategoryColor = (categoryId?: string) => {
    if (!categoryId) return null;
    return categories?.find(c => c.id === categoryId)?.color;
  };

  const handleCreate = (data: { name: string; unitPrice: number; categoryId?: string; description?: string }) => {
    createProduct.mutate(data);
  };

  const handleUpdate = (id: string, data: { name: string; unitPrice: number; categoryId?: string; description?: string }) => {
    updateProduct.mutate({ id, data });
  };

  const handleDelete = (id: string) => {
    deleteProduct.mutate(id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Produits</h1>
          <p className="text-muted-foreground">Gérez votre catalogue de produits</p>
        </div>
        <ProductDialog onSave={handleCreate}>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nouveau produit
          </Button>
        </ProductDialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Liste des produits</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un produit..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Toutes les catégories</option>
              {categories?.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead>Prix</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Chargement...
                  </TableCell>
                </TableRow>
              ) : filteredProducts?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5}>
                    <TableEmptyState colSpan={5} message={searchQuery || categoryFilter ? "Aucun produit trouvé" : "Aucun produit créé"} />
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts?.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        {product.name}
                      </div>
                      {product.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{product.description}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      {getCategoryName(product.categoryId) ? (
                        <Badge
                          variant="default"
                          style={{
                            backgroundColor: getCategoryColor(product.categoryId) || undefined,
                            color: getCategoryColor(product.categoryId) ? "white" : undefined,
                          }}
                        >
                          {getCategoryName(product.categoryId)}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell>{formatPrice(product.unitPrice)}</TableCell>
                    <TableCell>
                      <Badge variant={product.isActive ? "default" : "default"} className={product.isActive ? "" : "bg-gray-100 text-gray-600"}>
                        {product.isActive ? "Actif" : "Inactif"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <ProductDialog
                          product={product}
                          onSave={(data) => handleUpdate(product.id, data)}
                        >
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </ProductDialog>
                        <DeleteDialog product={product} onDelete={() => handleDelete(product.id)} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
