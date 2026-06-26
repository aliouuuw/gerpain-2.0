import { useMutation, useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'

import { Badge } from '#/components/ui/Badge'
import { Card } from '#/components/ui/Card'
import { HelpNote } from '#/components/ui/HelpNote'
import { useBakery } from '#/lib/bakery-context'
import {
  employeeInitials,
  employeeRoleLabel,
} from '#/lib/employee-labels'
import { orpc } from '#/lib/orpc-client'
import { usePermissions } from '#/lib/use-permissions'

type EmployeeRole = 'delivery' | 'cashier' | 'manager' | 'baker'

type EmployeeForm = {
  firstName: string
  lastName: string
  role: EmployeeRole
  phone: string
  locationIds: string[]
}

const emptyEmployeeForm = (): EmployeeForm => ({
  firstName: '',
  lastName: '',
  role: 'delivery',
  phone: '',
  locationIds: [],
})

export function EquipeView() {
  const { bakeryId, isLoading: bakeryLoading } = useBakery()
  const { canManageCollections: canManage } = usePermissions()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [form, setForm] = useState<EmployeeForm>(emptyEmployeeForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [productError, setProductError] = useState<string | null>(null)

  const employees = useQuery({
    ...orpc.employees.list.queryOptions({ input: { bakeryId } }),
    enabled: Boolean(bakeryId),
  })

  const locations = useQuery({
    ...orpc.locations.list.queryOptions({ input: { bakeryId } }),
    enabled: Boolean(bakeryId),
  })

  const catalog = useQuery({
    ...orpc.products.list.queryOptions({ input: { bakeryId } }),
    enabled: Boolean(bakeryId),
  })

  const assignments = useQuery({
    ...orpc.employees.listProducts.queryOptions({
      input: { bakeryId, employeeId: selectedId ?? '' },
    }),
    enabled: Boolean(bakeryId && selectedId),
  })

  const [draftProducts, setDraftProducts] = useState<
    Record<string, { enabled: boolean; commissionPerUnit: number }>
  >({})

  const selectedEmployee = useMemo(
    () => employees.data?.find((e) => e.id === selectedId),
    [employees.data, selectedId],
  )

  useEffect(() => {
    if (!catalog.data || !selectedId) return
    const assigned = assignments.data ?? []
    const next: Record<string, { enabled: boolean; commissionPerUnit: number }> =
      {}
    for (const product of catalog.data) {
      const existing = assigned.find((a) => a.productId === product.id)
      next[product.id] = {
        enabled: existing?.isActive !== false && Boolean(existing),
        commissionPerUnit: existing?.commissionPerUnit ?? 0,
      }
    }
    setDraftProducts(next)
  }, [catalog.data, assignments.data, selectedId])

  const createEmployee = useMutation(
    orpc.employees.create.mutationOptions({
      onSuccess: async () => {
        setForm(emptyEmployeeForm())
        setFormError(null)
        await employees.refetch()
      },
      onError: (error) => setFormError(error.message),
    }),
  )

  const deactivateEmployee = useMutation(
    orpc.employees.update.mutationOptions({
      onSuccess: () => employees.refetch(),
    }),
  )

  const reactivateEmployee = useMutation(
    orpc.employees.update.mutationOptions({
      onSuccess: () => employees.refetch(),
    }),
  )

  const saveProducts = useMutation(
    orpc.employees.setProducts.mutationOptions({
      onSuccess: async () => {
        setProductError(null)
        await Promise.all([assignments.refetch(), employees.refetch()])
      },
      onError: (error) => setProductError(error.message),
    }),
  )

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!bakeryId) return

    createEmployee.mutate({
      bakeryId,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      role: form.role,
      phone: form.phone.trim() || undefined,
      locationIds: form.locationIds.length > 0 ? form.locationIds : undefined,
    })
  }

  function toggleLocation(locationId: string) {
    setForm((current) => {
      const has = current.locationIds.includes(locationId)
      return {
        ...current,
        locationIds: has
          ? current.locationIds.filter((id) => id !== locationId)
          : [...current.locationIds, locationId],
      }
    })
  }

  function handleSaveProducts() {
    if (!bakeryId || !selectedId) return

    const products = Object.entries(draftProducts)
      .filter(([, value]) => value.enabled)
      .map(([productId, value]) => ({
        productId,
        commissionPerUnit: value.commissionPerUnit,
        isActive: true,
      }))

    saveProducts.mutate({
      bakeryId,
      employeeId: selectedId,
      products,
    })
  }

  return (
    <main className="page-content">
      <HelpNote>
        Assignez les produits que chaque livreur peut vendre. Ces produits
        apparaissent automatiquement sur leurs tournées du jour.
      </HelpNote>

      {canManage ? (
        <Card title="Ajouter un membre">
          <form className="settings-form settings-form--flush" onSubmit={(e) => void handleCreate(e)}>
            <div className="settings-form__grid">
              <label className="settings-form__field">
                <span>Prénom</span>
                <input
                  value={form.firstName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, firstName: e.target.value }))
                  }
                  required
                />
              </label>
              <label className="settings-form__field">
                <span>Nom</span>
                <input
                  value={form.lastName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, lastName: e.target.value }))
                  }
                  required
                />
              </label>
              <label className="settings-form__field">
                <span>Rôle</span>
                <select
                  value={form.role}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      role: e.target.value as EmployeeRole,
                    }))
                  }
                >
                  <option value="delivery">Livreur</option>
                  <option value="cashier">Caissier</option>
                  <option value="manager">Responsable</option>
                  <option value="baker">Boulanger</option>
                </select>
              </label>
              <label className="settings-form__field">
                <span>Téléphone</span>
                <input
                  value={form.phone}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, phone: e.target.value }))
                  }
                />
              </label>
            </div>
            {(locations.data?.length ?? 0) > 0 ? (
              <div className="location-checkboxes">
                <span className="settings-form__hint">Lieux assignés</span>
                <div className="location-checkboxes__list">
                  {locations.data?.map((location) => (
                    <label key={location.id} className="settings-checkbox">
                      <input
                        type="checkbox"
                        checked={form.locationIds.includes(location.id)}
                        onChange={() => toggleLocation(location.id)}
                      />
                      {location.name}
                    </label>
                  ))}
                </div>
              </div>
            ) : null}
            {formError ? (
              <p className="settings-form__error">{formError}</p>
            ) : null}
            <div className="settings-form__actions">
              <button
                type="submit"
                className="btn-primary btn-sm"
                disabled={createEmployee.isPending}
              >
                {createEmployee.isPending ? 'Ajout…' : 'Ajouter'}
              </button>
            </div>
          </form>
        </Card>
      ) : null}

      {bakeryLoading || employees.isLoading ? (
        <p className="settings-form__hint">Chargement de l&apos;équipe…</p>
      ) : employees.isError ? (
        <p className="settings-form__error">Impossible de charger l&apos;équipe.</p>
      ) : (employees.data?.length ?? 0) === 0 ? (
        <p className="settings-form__hint">Aucun employé pour cette boulangerie.</p>
      ) : (
        <section className="cards-grid">
          {employees.data?.map((employee) => (
            <Card key={employee.id}>
              <div className="agent-card">
                <div className="avatar agent-avatar-lg">
                  {employeeInitials(employee.firstName, employee.lastName)}
                </div>
                <div className="agent-card-info">
                  <div className="agent-name">{employee.fullName}</div>
                  <div className="agent-role">
                    {employeeRoleLabel(employee.role)}
                  </div>
                  <div className="agent-phone">
                    {employee.phone ?? '—'}
                  </div>
                  <div className="agent-meta">
                    <Badge variant="neutral">
                      {`${employee.productCount} produit${employee.productCount > 1 ? 's' : ''}`}
                    </Badge>
                    {employee.status === 'inactive' ? (
                      <Badge variant="warning">Inactif</Badge>
                    ) : (
                      <Badge variant="success">Actif</Badge>
                    )}
                  </div>
                  <div className="agent-card-actions">
                    <button
                      type="button"
                      className={`table-action${selectedId === employee.id ? ' table-action--primary' : ''}`}
                      onClick={() =>
                        setSelectedId(
                          selectedId === employee.id ? null : employee.id,
                        )
                      }
                    >
                      {selectedId === employee.id
                        ? 'Fermer'
                        : 'Produits assignés'}
                    </button>
                    {canManage ? (
                      employee.status === 'active' ? (
                        <button
                          type="button"
                          className="table-action"
                          onClick={() =>
                            deactivateEmployee.mutate({
                              bakeryId,
                              employeeId: employee.id,
                              status: 'inactive',
                            })
                          }
                        >
                          Désactiver
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="table-action table-action--primary"
                          onClick={() =>
                            reactivateEmployee.mutate({
                              bakeryId,
                              employeeId: employee.id,
                              status: 'active',
                            })
                          }
                        >
                          Réactiver
                        </button>
                      )
                    ) : null}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </section>
      )}

      {selectedEmployee && selectedId ? (
        <Card title={`Produits — ${selectedEmployee.fullName}`} className="settings-card--wide">
          {!canManage ? (
            <p className="settings-form__hint">
              Consultation seule. Seuls les responsables peuvent modifier les
              assignations.
            </p>
          ) : null}
          {assignments.isLoading || catalog.isLoading ? (
            <p className="settings-form__hint">Chargement des produits…</p>
          ) : (catalog.data?.length ?? 0) === 0 ? (
            <p className="settings-form__hint">
              Aucun produit dans le catalogue. Ajoutez-en dans Réglages.
            </p>
          ) : (
            <>
              <div className="product-assignment-list">
                {catalog.data?.map((product) => {
                  const draft = draftProducts[product.id] ?? {
                    enabled: false,
                    commissionPerUnit: 0,
                  }
                  return (
                    <label key={product.id} className="product-assignment-row">
                      <input
                        type="checkbox"
                        checked={draft.enabled}
                        disabled={!canManage}
                        onChange={(e) =>
                          setDraftProducts((current) => ({
                            ...current,
                            [product.id]: {
                              ...draft,
                              enabled: e.target.checked,
                            },
                          }))
                        }
                      />
                      <span className="product-assignment-row__name">
                        {product.name}
                      </span>
                      <span className="product-assignment-row__price">
                        {product.unitPrice} F
                      </span>
                      <input
                        type="number"
                        min={0}
                        className="product-assignment-row__commission"
                        disabled={!canManage || !draft.enabled}
                        value={draft.commissionPerUnit}
                        onChange={(e) =>
                          setDraftProducts((current) => ({
                            ...current,
                            [product.id]: {
                              ...draft,
                              commissionPerUnit: Number(e.target.value) || 0,
                            },
                          }))
                        }
                        aria-label={`Commission ${product.name}`}
                      />
                      <span className="product-assignment-row__suffix">F/u</span>
                    </label>
                  )
                })}
              </div>
              {productError ? (
                <p className="settings-form__error">{productError}</p>
              ) : null}
              {canManage ? (
                <div className="settings-form__actions">
                  <button
                    type="button"
                    className="btn-primary btn-sm"
                    disabled={saveProducts.isPending}
                    onClick={() => void handleSaveProducts()}
                  >
                    {saveProducts.isPending
                      ? 'Enregistrement…'
                      : 'Enregistrer les assignations'}
                  </button>
                </div>
              ) : null}
            </>
          )}
        </Card>
      ) : null}
    </main>
  )
}
