import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'

import { Badge } from '#/components/ui/Badge'
import { Card } from '#/components/ui/Card'
import { ConfirmDialog } from '#/components/ui/ConfirmDialog'
import { orpc } from '#/lib/orpc-client'
import { usePermissions } from '#/lib/use-permissions'

type FormState = {
  name: string
  description: string
  color: string
  sortOrder: string
}

const emptyForm = (): FormState => ({
  name: '',
  description: '',
  color: '',
  sortOrder: '0',
})

export function CategoriesSettings() {
  const { canManageCollections: canManage } = usePermissions()
  const [showInactive, setShowInactive] = useState(false)
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
    orpc.categories.list.queryOptions({
      input: { includeInactive: showInactive },
    }),
  )

  const createMutation = useMutation(
    orpc.categories.create.mutationOptions({
      onSuccess: async () => {
        setForm(emptyForm())
        setFormError(null)
        setShowForm(false)
        await categories.refetch()
      },
      onError: (error) => setFormError(error.message),
    }),
  )

  const updateMutation = useMutation(
    orpc.categories.update.mutationOptions({
      onSuccess: async () => {
        setEditingId(null)
        setForm(emptyForm())
        setFormError(null)
        setShowForm(false)
        await categories.refetch()
      },
      onError: (error) => setFormError(error.message),
    }),
  )

  const deactivateMutation = useMutation(
    orpc.categories.deactivate.mutationOptions({
      onSuccess: () => {
        setPendingDeactivate(null)
        void categories.refetch()
      },
    }),
  )

  const reactivateMutation = useMutation(
    orpc.categories.update.mutationOptions({
      onSuccess: () => categories.refetch(),
    }),
  )

  function startEdit(category: {
    id: string
    name: string
    description: string | null
    color: string | null
    sortOrder: number | null
  }) {
    setShowForm(true)
    setEditingId(category.id)
    setForm({
      name: category.name,
      description: category.description ?? '',
      color: category.color ?? '',
      sortOrder: String(category.sortOrder ?? 0),
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
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      color: form.color.trim() || undefined,
      sortOrder: Number(form.sortOrder) || 0,
    }

    if (editingId) {
      updateMutation.mutate({ ...payload, categoryId: editingId })
      return
    }

    createMutation.mutate(payload)
  }

  const saving = createMutation.isPending || updateMutation.isPending

  return (
    <Card title="Catégories" className="settings-section">
      {canManage && !formVisible ? (
        <div className="settings-section__toolbar">
          <button
            type="button"
            className="btn-primary btn-sm"
            onClick={() => setShowForm(true)}
          >
            + Ajouter une catégorie
          </button>
        </div>
      ) : null}

      {canManage && formVisible ? (
        <form className="settings-form" onSubmit={(e) => void handleSubmit(e)}>
          <p className="settings-form__hint">
            {editingId ? 'Modifier la catégorie' : 'Ajouter une catégorie'}
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
              <span>Ordre</span>
              <input
                type="number"
                value={form.sortOrder}
                onChange={(e) =>
                  setForm((f) => ({ ...f, sortOrder: e.target.value }))
                }
              />
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
            <label className="settings-form__field">
              <span>Couleur</span>
              <input
                value={form.color}
                onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                placeholder="#D97706"
                maxLength={32}
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
          Seuls les responsables peuvent gérer les catégories.
        </p>
      ) : null}

      <div className="settings-list-toolbar">
        <label className="settings-checkbox">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
          />
          Afficher les catégories inactives
        </label>
      </div>

      {categories.isLoading ? (
        <p className="settings-form__hint">Chargement…</p>
      ) : categories.isError ? (
        <p className="settings-form__error">Impossible de charger les catégories.</p>
      ) : (categories.data?.length ?? 0) === 0 ? (
        <p className="settings-form__hint">Aucune catégorie.</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Ordre</th>
                <th>Statut</th>
                {canManage ? <th aria-label="Actions" /> : null}
              </tr>
            </thead>
            <tbody>
              {categories.data?.map((category) => (
                <tr key={category.id}>
                  <td>
                    <span className="category-name">
                      {category.color ? (
                        <span
                          className="category-swatch"
                          style={{ background: category.color }}
                          aria-hidden
                        />
                      ) : null}
                      {category.name}
                    </span>
                  </td>
                  <td>{category.sortOrder ?? 0}</td>
                  <td>
                    {category.isActive === false ? (
                      <Badge variant="neutral">Inactive</Badge>
                    ) : (
                      <Badge variant="success">Active</Badge>
                    )}
                  </td>
                  {canManage ? (
                    <td className="table-actions">
                      <button
                        type="button"
                        className="table-action"
                        onClick={() => startEdit(category)}
                      >
                        Modifier
                      </button>
                      {category.isActive !== false ? (
                        <button
                          type="button"
                          className="table-action"
                          onClick={() =>
                            setPendingDeactivate({
                              id: category.id,
                              name: category.name,
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
                              categoryId: category.id,
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
        title="Désactiver cette catégorie ?"
        confirmLabel="Désactiver"
        confirmVariant="danger"
        loading={deactivateMutation.isPending}
        onCancel={() => setPendingDeactivate(null)}
        onConfirm={() => {
          if (!pendingDeactivate) return
          deactivateMutation.mutate({
            categoryId: pendingDeactivate.id,
          })
        }}
      >
        <p>
          « {pendingDeactivate?.name} » ne sera plus proposée pour les nouveaux
          produits. Les produits existants conservent leur catégorie.
        </p>
      </ConfirmDialog>
    </Card>
  )
}
