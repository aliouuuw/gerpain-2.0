import { useMutation, useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'

import { Card } from '#/components/ui/Card'
import { HelpNote } from '#/components/ui/HelpNote'
import { useBakery } from '#/lib/bakery-context'
import { orpc } from '#/lib/orpc-client'
import { usePermissions } from '#/lib/use-permissions'

export function AffectationsView({
  employeeId,
}: {
  employeeId: string | undefined
}) {
  const navigate = useNavigate()
  const { bakeryId } = useBakery()
  const { canManageCollections: canManage } = usePermissions()
  const [selectedId, setSelectedId] = useState<string | null>(employeeId ?? null)
  const [productError, setProductError] = useState<string | null>(null)

  const employees = useQuery({
    ...orpc.employees.list.queryOptions({ input: { bakeryId } }),
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

  const activeEmployees = useMemo(
    () => (employees.data ?? []).filter((e) => e.status === 'active'),
    [employees.data],
  )

  useEffect(() => {
    if (employeeId) {
      setSelectedId(employeeId)
    }
  }, [employeeId])

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

  const saveProducts = useMutation(
    orpc.employees.setProducts.mutationOptions({
      onSuccess: async () => {
        setProductError(null)
        await Promise.all([assignments.refetch(), employees.refetch()])
      },
      onError: (error) => setProductError(error.message),
    }),
  )

  function handleEmployeeChange(id: string) {
    setSelectedId(id || null)
    void navigate({
      to: '/equipe/affectations',
      search: id ? { employee: id } : {},
      replace: true,
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
    <div className="section-stack">
      <HelpNote>
        Assignez les produits que chaque livreur peut vendre et leur commission
        unitaire. Ces produits apparaissent automatiquement sur leurs tournées du
        jour.
      </HelpNote>

      <Card title="Agent">
        {employees.isLoading ? (
          <p className="settings-form__hint">Chargement…</p>
        ) : activeEmployees.length === 0 ? (
          <p className="settings-form__hint">
            Aucun agent actif.{' '}
            <Link to="/equipe/annuaire" className="text-link">
              Ajoutez un membre dans l&apos;annuaire
            </Link>
            .
          </p>
        ) : (
          <label className="settings-form__field">
            <span>Livreur ou caissier</span>
            <select
              value={selectedId ?? ''}
              onChange={(e) => handleEmployeeChange(e.target.value)}
            >
              <option value="">Choisir un agent…</option>
              {activeEmployees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.fullName}
                </option>
              ))}
            </select>
          </label>
        )}
      </Card>

      {selectedEmployee && selectedId ? (
        <Card
          title={`Produits — ${selectedEmployee.fullName}`}
          className="settings-card--wide"
        >
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
              Aucun produit dans le catalogue.{' '}
              <Link to="/reglages/produits" className="text-link">
                Ajoutez des produits
              </Link>
              .
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
    </div>
  )
}
