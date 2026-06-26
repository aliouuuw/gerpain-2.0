import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'

import { Badge } from '#/components/ui/Badge'
import { Card } from '#/components/ui/Card'
import { ConfirmDialog } from '#/components/ui/ConfirmDialog'
import { useBakery } from '#/lib/bakery-context'
import { locationTypeLabel } from '#/lib/location-labels'
import { orpc } from '#/lib/orpc-client'
import { usePermissions } from '#/lib/use-permissions'

type LocationType = 'shop' | 'warehouse'

type FormState = {
  name: string
  type: LocationType
  address: string
  phone: string
}

const emptyForm = (): FormState => ({
  name: '',
  type: 'shop',
  address: '',
  phone: '',
})

export function LocationsSettings() {
  const { bakeryId, isLoading: bakeryLoading } = useBakery()
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

  const locations = useQuery({
    ...orpc.locations.list.queryOptions({
      input: { bakeryId, includeInactive: showInactive },
    }),
    enabled: Boolean(bakeryId),
  })

  const createMutation = useMutation(
    orpc.locations.create.mutationOptions({
      onSuccess: async () => {
        setForm(emptyForm())
        setFormError(null)
        setShowForm(false)
        await locations.refetch()
      },
      onError: (error) => {
        setFormError(error.message)
      },
    }),
  )

  const updateMutation = useMutation(
    orpc.locations.update.mutationOptions({
      onSuccess: async () => {
        setEditingId(null)
        setForm(emptyForm())
        setFormError(null)
        setShowForm(false)
        await locations.refetch()
      },
      onError: (error) => {
        setFormError(error.message)
      },
    }),
  )

  const deactivateMutation = useMutation(
    orpc.locations.deactivate.mutationOptions({
      onSuccess: () => {
        setPendingDeactivate(null)
        void locations.refetch()
      },
    }),
  )

  const reactivateMutation = useMutation(
    orpc.locations.update.mutationOptions({
      onSuccess: () => locations.refetch(),
    }),
  )

  function startEdit(location: {
    id: string
    name: string
    type: string
    address: string | null
    phone: string | null
  }) {
    setShowForm(true)
    setEditingId(location.id)
    setForm({
      name: location.name,
      type: location.type as LocationType,
      address: location.address ?? '',
      phone: location.phone ?? '',
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

    const payload = {
      bakeryId,
      name: form.name.trim(),
      type: form.type,
      address: form.address.trim() || undefined,
      phone: form.phone.trim() || undefined,
    }

    if (editingId) {
      updateMutation.mutate({
        ...payload,
        locationId: editingId,
      })
      return
    }

    createMutation.mutate(payload)
  }

  const saving = createMutation.isPending || updateMutation.isPending

  return (
    <Card
      title="Lieux (boutiques et dépôts)"
      className="settings-section settings-section--wide"
    >
      {canManage && !formVisible ? (
        <div className="settings-section__toolbar">
          <button
            type="button"
            className="btn-primary btn-sm"
            onClick={() => setShowForm(true)}
          >
            + Ajouter un lieu
          </button>
        </div>
      ) : null}

      {canManage && formVisible ? (
        <form className="settings-form" onSubmit={(e) => void handleSubmit(e)}>
          <p className="settings-form__hint">
            {editingId
              ? 'Modifier le lieu sélectionné'
              : 'Ajouter un lieu pour cette boulangerie'}
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
              <span>Type</span>
              <select
                value={form.type}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    type: e.target.value as LocationType,
                  }))
                }
              >
                <option value="shop">Boutique</option>
                <option value="warehouse">Dépôt</option>
              </select>
            </label>
            <label className="settings-form__field settings-form__field--wide">
              <span>Adresse</span>
              <input
                value={form.address}
                onChange={(e) =>
                  setForm((f) => ({ ...f, address: e.target.value }))
                }
                maxLength={500}
              />
            </label>
            <label className="settings-form__field">
              <span>Téléphone</span>
              <input
                value={form.phone}
                onChange={(e) =>
                  setForm((f) => ({ ...f, phone: e.target.value }))
                }
                maxLength={50}
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
            <button
              type="button"
              className="table-action"
              onClick={cancelEdit}
            >
              Annuler
            </button>
          </div>
        </form>
      ) : !canManage ? (
        <p className="settings-form__hint">
          Seuls les responsables peuvent créer ou modifier les lieux.
        </p>
      ) : null}

      <div className="settings-list-toolbar">
        <label className="settings-checkbox">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
          />
          Afficher les lieux inactifs
        </label>
      </div>

      {bakeryLoading || locations.isLoading ? (
        <p className="settings-form__hint">Chargement des lieux…</p>
      ) : locations.isError ? (
        <p className="settings-form__error">Impossible de charger les lieux.</p>
      ) : (locations.data?.length ?? 0) === 0 ? (
        <p className="settings-form__hint">Aucun lieu pour cette boulangerie.</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Type</th>
                <th>Adresse</th>
                <th>Téléphone</th>
                <th>Statut</th>
                {canManage ? <th aria-label="Actions" /> : null}
              </tr>
            </thead>
            <tbody>
              {locations.data?.map((location) => (
                <tr key={location.id}>
                  <td>{location.name}</td>
                  <td>{locationTypeLabel(location.type)}</td>
                  <td>{location.address ?? '—'}</td>
                  <td>{location.phone ?? '—'}</td>
                  <td>
                    {location.isActive === false ? (
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
                        onClick={() => startEdit(location)}
                      >
                        Modifier
                      </button>
                      {location.isActive !== false ? (
                        <button
                          type="button"
                          className="table-action"
                          onClick={() =>
                            setPendingDeactivate({
                              id: location.id,
                              name: location.name,
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
                              locationId: location.id,
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
        title="Désactiver ce lieu ?"
        confirmLabel="Désactiver"
        confirmVariant="danger"
        loading={deactivateMutation.isPending}
        onCancel={() => setPendingDeactivate(null)}
        onConfirm={() => {
          if (!pendingDeactivate || !bakeryId) return
          deactivateMutation.mutate({
            bakeryId,
            locationId: pendingDeactivate.id,
          })
        }}
      >
        <p>
          « {pendingDeactivate?.name} » ne sera plus proposé pour les nouvelles
          tournées. Les données existantes sont conservées.
        </p>
      </ConfirmDialog>
    </Card>
  )
}
