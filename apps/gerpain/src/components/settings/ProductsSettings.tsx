import { useMutation, useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'

import { Badge } from '#/components/ui/Badge'
import { Card } from '#/components/ui/Card'
import { useBakery } from '#/lib/bakery-context'
import { formatXof } from '#/lib/format-money'
import { orpc } from '#/lib/orpc-client'
import { usePermissions } from '#/lib/use-permissions'

type FormState = {
  name: string
  unitPrice: string
  categoryId: string
  description: string
}

const emptyForm = (): FormState => ({
  name: '',
  unitPrice: '',
  categoryId: '',
  description: '',
})

export function ProductsSettings() {
  const { bakeryId, isLoading: bakeryLoading } = useBakery()
  const { canManageCollections: canManage } = usePermissions()
  const [showInactive, setShowInactive] = useState(false)
  const [filterCategoryId, setFilterCategoryId] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)

  const categories = useQuery(
    orpc.categories.list.queryOptions({ input: {} }),
  )

  const products = useQuery({
    ...orpc.products.list.queryOptions({
      input: {
        bakeryId,
        includeInactive: showInactive,
        categoryId: filterCategoryId || undefined,
      },
    }),
    enabled: Boolean(bakeryId),
  })

  const activeCategories = useMemo(
    () => (categories.data ?? []).filter((c) => c.isActive !== false),
    [categories.data],
  )

  const createMutation = useMutation(
    orpc.products.create.mutationOptions({
      onSuccess: async () => {
        setForm(emptyForm())
        setFormError(null)
        await products.refetch()
      },
      onError: (error) => setFormError(error.message),
    }),
  )

  const updateMutation = useMutation(
    orpc.products.update.mutationOptions({
      onSuccess: async () => {
        setEditingId(null)
        setForm(emptyForm())
        setFormError(null)
        await products.refetch()
      },
      onError: (error) => setFormError(error.message),
    }),
  )

  const deactivateMutation = useMutation(
    orpc.products.deactivate.mutationOptions({
      onSuccess: () => products.refetch(),
    }),
  )

  const reactivateMutation = useMutation(
    orpc.products.update.mutationOptions({
      onSuccess: () => products.refetch(),
    }),
  )

  function startEdit(product: {
    id: string
    name: string
    unitPrice: number
    categoryId: string | null
    description: string | null
  }) {
    setEditingId(product.id)
    setForm({
      name: product.name,
      unitPrice: String(product.unitPrice),
      categoryId: product.categoryId ?? '',
      description: product.description ?? '',
    })
    setFormError(null)
  }

  function cancelEdit() {
    setEditingId(null)
    setForm(emptyForm())
    setFormError(null)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!bakeryId) return

    const unitPrice = Number(form.unitPrice)
    if (!Number.isInteger(unitPrice) || unitPrice <= 0) {
      setFormError('Le prix doit être un entier positif (FCFA).')
      return
    }

    const payload = {
      bakeryId,
      name: form.name.trim(),
      unitPrice,
      categoryId: form.categoryId || undefined,
      description: form.description.trim() || undefined,
    }

    if (editingId) {
      updateMutation.mutate({
        ...payload,
        productId: editingId,
        categoryId: form.categoryId || null,
      })
      return
    }

    createMutation.mutate(payload)
  }

  const saving = createMutation.isPending || updateMutation.isPending

  return (
    <Card title="Produits et prix" className="settings-card--wide">
      {canManage ? (
        <form className="settings-form" onSubmit={(e) => void handleSubmit(e)}>
          <p className="settings-form__hint">
            {editingId
              ? 'Modifier le produit'
              : 'Ajouter un produit pour cette boulangerie'}
          </p>
          <div className="settings-form__grid">
            <label className="settings-form__field">
              <span>Nom</span>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
                maxLength={255}
              />
            </label>
            <label className="settings-form__field">
              <span>Prix unitaire (FCFA)</span>
              <input
                type="number"
                min={1}
                step={1}
                value={form.unitPrice}
                onChange={(e) =>
                  setForm((f) => ({ ...f, unitPrice: e.target.value }))
                }
                required
              />
            </label>
            <label className="settings-form__field">
              <span>Catégorie</span>
              <select
                value={form.categoryId}
                onChange={(e) =>
                  setForm((f) => ({ ...f, categoryId: e.target.value }))
                }
              >
                <option value="">— Aucune —</option>
                {activeCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="settings-form__field settings-form__field--wide">
              <span>Description</span>
              <input
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                maxLength={500}
              />
            </label>
          </div>
          {formError ? (
            <p className="settings-form__error">{formError}</p>
          ) : null}
          <div className="settings-form__actions">
            <button type="submit" className="btn-primary btn-sm" disabled={saving}>
              {saving
                ? 'Enregistrement…'
                : editingId
                  ? 'Enregistrer'
                  : 'Ajouter'}
            </button>
            {editingId ? (
              <button type="button" className="table-action" onClick={cancelEdit}>
                Annuler
              </button>
            ) : null}
          </div>
        </form>
      ) : (
        <p className="settings-form__hint">
          Seuls les responsables peuvent gérer le catalogue produits.
        </p>
      )}

      <div className="settings-list-toolbar settings-list-toolbar--split">
        <label className="settings-form__field settings-filter">
          <span>Filtrer par catégorie</span>
          <select
            value={filterCategoryId}
            onChange={(e) => setFilterCategoryId(e.target.value)}
          >
            <option value="">Toutes</option>
            {activeCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label className="settings-checkbox">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
          />
          Afficher les produits inactifs
        </label>
      </div>

      {bakeryLoading || products.isLoading ? (
        <p className="settings-form__hint">Chargement des produits…</p>
      ) : products.isError ? (
        <p className="settings-form__error">Impossible de charger les produits.</p>
      ) : (products.data?.length ?? 0) === 0 ? (
        <p className="settings-form__hint">Aucun produit pour cette boulangerie.</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Produit</th>
                <th>Catégorie</th>
                <th>Prix</th>
                <th>Statut</th>
                {canManage ? <th aria-label="Actions" /> : null}
              </tr>
            </thead>
            <tbody>
              {products.data?.map((product) => (
                <tr key={product.id}>
                  <td>{product.name}</td>
                  <td>{product.categoryName ?? '—'}</td>
                  <td className="cell-money">{formatXof(product.unitPrice)}</td>
                  <td>
                    {product.isActive === false ? (
                      <Badge variant="neutral">Inactif</Badge>
                    ) : (
                      <Badge variant="success">Actif</Badge>
                    )}
                  </td>
                  {canManage ? (
                    <td className="table-actions">
                      <button
                        type="button"
                        className="table-action"
                        onClick={() => startEdit(product)}
                      >
                        Modifier
                      </button>
                      {product.isActive !== false ? (
                        <button
                          type="button"
                          className="table-action"
                          disabled={deactivateMutation.isPending}
                          onClick={() =>
                            deactivateMutation.mutate({
                              bakeryId,
                              productId: product.id,
                            })
                          }
                        >
                          Désactiver
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="table-action table-action--primary"
                          disabled={reactivateMutation.isPending}
                          onClick={() =>
                            reactivateMutation.mutate({
                              bakeryId,
                              productId: product.id,
                              isActive: true,
                            })
                          }
                        >
                          Réactiver
                        </button>
                      )}
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}
