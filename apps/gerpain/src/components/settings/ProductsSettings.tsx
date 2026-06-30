import { useMutation, useQuery } from '@tanstack/react-query'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { useMemo, useState } from 'react'

import { Badge } from '#/components/ui/Badge'
import { Card } from '#/components/ui/Card'
import { ConfirmDialog } from '#/components/ui/ConfirmDialog'
import { PriceInput } from '#/components/ui/PriceInput'
import { useBakery } from '#/lib/bakery-context'
import {
  formatXof,
  formatXofInput,
  xofInputToNumber,
} from '#/lib/format-money'
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
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [pendingDeactivate, setPendingDeactivate] = useState<{
    id: string
    name: string
  } | null>(null)

  const formVisible = showForm || Boolean(editingId)

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
        setShowForm(false)
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
        setShowForm(false)
        await products.refetch()
      },
      onError: (error) => setFormError(error.message),
    }),
  )

  const deactivateMutation = useMutation(
    orpc.products.deactivate.mutationOptions({
      onSuccess: () => {
        setPendingDeactivate(null)
        void products.refetch()
      },
    }),
  )

  const reactivateMutation = useMutation(
    orpc.products.update.mutationOptions({
      onSuccess: () => products.refetch(),
    }),
  )

  const reorderMutation = useMutation(
    orpc.products.reorder.mutationOptions({
      onSuccess: () => products.refetch(),
    }),
  )

  // Reordering writes a global sort order, so only allow it on the full,
  // unfiltered list to avoid clobbering the order of hidden products.
  const canReorder =
    canManage && !filterCategoryId && !showInactive && !formVisible

  function moveProduct(index: number, direction: -1 | 1) {
    if (!bakeryId) return
    const list = products.data ?? []
    const target = index + direction
    if (target < 0 || target >= list.length) return

    const orderedIds = list.map((p) => p.id)
    const [moved] = orderedIds.splice(index, 1)
    orderedIds.splice(target, 0, moved!)

    reorderMutation.mutate({ bakeryId, orderedIds })
  }

  function startEdit(product: {
    id: string
    name: string
    unitPrice: number
    categoryId: string | null
    description: string | null
  }) {
    setShowForm(true)
    setEditingId(product.id)
    setForm({
      name: product.name,
      unitPrice: formatXofInput(product.unitPrice),
      categoryId: product.categoryId ?? '',
      description: product.description ?? '',
    })
    setFormError(null)
  }

  function cancelEdit() {
    setEditingId(null)
    setForm(emptyForm())
    setFormError(null)
    setShowForm(false)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!bakeryId) return

    const unitPrice = xofInputToNumber(form.unitPrice)
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
    <Card
      title="Produits et prix"
      className="settings-section settings-section--wide"
    >
      {canManage && !formVisible ? (
        <div className="settings-section__toolbar">
          <button
            type="button"
            className="btn-primary btn-sm"
            onClick={() => setShowForm(true)}
          >
            + Ajouter un produit
          </button>
        </div>
      ) : null}

      {canManage && formVisible ? (
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
              <span>Prix unitaire</span>
              <PriceInput
                value={form.unitPrice}
                onChange={(unitPrice) => setForm((f) => ({ ...f, unitPrice }))}
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
            <button type="button" className="table-action" onClick={cancelEdit}>
              Annuler
            </button>
          </div>
        </form>
      ) : !canManage ? (
        <p className="settings-form__hint">
          Seuls les responsables peuvent gérer le catalogue produits.
        </p>
      ) : null}

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

      {canManage && !canReorder && (products.data?.length ?? 0) > 1 ? (
        <p className="settings-form__hint">
          Pour réordonner les produits, retirez le filtre catégorie et masquez
          les produits inactifs.
        </p>
      ) : null}

      {bakeryLoading || products.isLoading ? (
        <p className="settings-form__hint">Chargement des produits…</p>
      ) : products.isError ? (
        <p className="settings-form__error">Impossible de charger les produits.</p>
      ) : (products.data?.length ?? 0) === 0 ? (
        <p className="settings-form__hint">
          Aucun produit pour cette boulangerie.{' '}
          <Link to="/reglages/categories" className="text-link">
            Commencez par les catégories
          </Link>
          , puis ajoutez vos produits ici.
        </p>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                {canReorder ? <th aria-label="Ordre" /> : null}
                <th>Produit</th>
                <th>Catégorie</th>
                <th>Prix</th>
                <th>Statut</th>
                {canManage ? <th aria-label="Actions" /> : null}
              </tr>
            </thead>
            <tbody>
              {products.data?.map((product, index) => (
                <tr key={product.id}>
                  {canReorder ? (
                    <td className="reorder-cell">
                      <button
                        type="button"
                        className="reorder-btn"
                        aria-label="Monter"
                        disabled={index === 0 || reorderMutation.isPending}
                        onClick={() => moveProduct(index, -1)}
                      >
                        <ChevronUp size={16} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className="reorder-btn"
                        aria-label="Descendre"
                        disabled={
                          index === (products.data?.length ?? 0) - 1 ||
                          reorderMutation.isPending
                        }
                        onClick={() => moveProduct(index, 1)}
                      >
                        <ChevronDown size={16} aria-hidden="true" />
                      </button>
                    </td>
                  ) : null}
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
                          onClick={() =>
                            setPendingDeactivate({
                              id: product.id,
                              name: product.name,
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

      <ConfirmDialog
        open={pendingDeactivate !== null}
        title="Désactiver ce produit ?"
        confirmLabel="Désactiver"
        confirmVariant="danger"
        loading={deactivateMutation.isPending}
        onCancel={() => setPendingDeactivate(null)}
        onConfirm={() => {
          if (!pendingDeactivate || !bakeryId) return
          deactivateMutation.mutate({
            bakeryId,
            productId: pendingDeactivate.id,
          })
        }}
      >
        <p>
          « {pendingDeactivate?.name} » ne sera plus proposé dans les tournées.
          Les données historiques sont conservées.
        </p>
      </ConfirmDialog>
    </Card>
  )
}
