import { useMutation, useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'

import {
  EmployeeDirectoryTable,
  type EmployeeDirectoryRow,
} from '#/components/equipe/EmployeeDirectoryTable'
import { EmployeeStatsSummary } from '#/components/equipe/EmployeeStatsSummary'
import { Card } from '#/components/ui/Card'
import { ConfirmDialog } from '#/components/ui/ConfirmDialog'
import { HelpNote } from '#/components/ui/HelpNote'
import { Modal } from '#/components/ui/Modal'
import { useBakery } from '#/lib/bakery-context'
import { mutationError, mutationSuccess } from '#/lib/mutation-feedback'
import { orpc } from '#/lib/orpc-client'
import { useToast } from '#/lib/toast'
import { usePermissions } from '#/lib/use-permissions'

type EmployeeRole = 'delivery' | 'cashier' | 'manager' | 'baker'

type EmployeeForm = {
  firstName: string
  lastName: string
  role: EmployeeRole
  phone: string
  baseSalary: string
  locationIds: string[]
}

const emptyEmployeeForm = (): EmployeeForm => ({
  firstName: '',
  lastName: '',
  role: 'delivery',
  phone: '',
  baseSalary: '',
  locationIds: [],
})

export function AnnuaireView() {
  const { bakeryId, isLoading: bakeryLoading } = useBakery()
  const { canManageCollections: canManage } = usePermissions()
  const toast = useToast()
  const [form, setForm] = useState<EmployeeForm>(emptyEmployeeForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const [pendingArchive, setPendingArchive] = useState<{
    id: string
    fullName: string
  } | null>(null)

  const employees = useQuery({
    ...orpc.employees.list.queryOptions({ input: { bakeryId } }),
    enabled: Boolean(bakeryId),
  })

  const locations = useQuery({
    ...orpc.locations.list.queryOptions({ input: { bakeryId } }),
    enabled: Boolean(bakeryId),
  })

  const locationNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const location of locations.data ?? []) {
      map.set(location.id, location.name)
    }
    return map
  }, [locations.data])

  const tableRows = useMemo<EmployeeDirectoryRow[]>(() => {
    return (employees.data ?? []).map((employee) => ({
      id: employee.id,
      firstName: employee.firstName,
      lastName: employee.lastName,
      fullName: employee.fullName,
      phone: employee.phone,
      role: employee.role,
      status: employee.status,
      baseSalary: employee.baseSalary,
      productCount: employee.productCount,
      locationLabel:
        employee.locationIds.length > 0
          ? employee.locationIds
              .map((id) => locationNameById.get(id) ?? id)
              .join(', ')
          : '',
    }))
  }, [employees.data, locationNameById])

  const visibleRows = useMemo(() => {
    if (showArchived) return tableRows
    return tableRows.filter((row) => row.status === 'active')
  }, [showArchived, tableRows])

  const stats = useMemo(() => {
    const list = employees.data ?? []
    const active = list.filter((e) => e.status === 'active')
    const deliveryActive = active.filter((e) => e.role === 'delivery')
    const monthlyPayroll = active.reduce(
      (sum, e) => sum + (e.baseSalary ?? 0),
      0,
    )
    const withSalary = active.filter(
      (e) => (e.baseSalary ?? 0) > 0 || e.productCount > 0,
    )
    const withLocation = active.filter((e) => e.locationIds.length > 0)
    const withPhone = active.filter((e) => Boolean(e.phone?.trim()))
    const deliveryReady = deliveryActive.filter((e) => e.productCount > 0)
    const deliveryProducts = deliveryActive.reduce(
      (sum, e) => sum + e.productCount,
      0,
    )
    const avgSalary =
      withSalary.length > 0
        ? Math.round(monthlyPayroll / withSalary.length)
        : 0
    const assignedProducts = active.reduce(
      (sum, e) => sum + e.productCount,
      0,
    )
    const salaryCoveragePct =
      active.length > 0
        ? Math.round((withSalary.length / active.length) * 100)
        : 0
    const deliveryReadyPct =
      deliveryActive.length > 0
        ? Math.round((deliveryReady.length / deliveryActive.length) * 100)
        : 0
    return {
      total: list.length,
      active: active.length,
      inactive: list.length - active.length,
      delivery: deliveryActive.length,
      cashier: active.filter((e) => e.role === 'cashier').length,
      baker: active.filter((e) => e.role === 'baker').length,
      manager: active.filter((e) => e.role === 'manager').length,
      monthlyPayroll,
      avgSalary,
      salaryCoveragePct,
      assignedProducts,
      avgProductsPerDelivery:
        deliveryActive.length > 0
          ? deliveryProducts / deliveryActive.length
          : 0,
      deliveryReady: deliveryReady.length,
      deliveryReadyPct,
      withLocation: withLocation.length,
      withPhone: withPhone.length,
      missingSalary: active.filter(
        (e) => (e.baseSalary ?? 0) === 0 && e.productCount === 0,
      ).length,
      missingProducts: deliveryActive.filter((e) => e.productCount === 0).length,
      missingLocation: active.length - withLocation.length,
      missingPhone: active.length - withPhone.length,
    }
  }, [employees.data])

  const createEmployee = useMutation(
    orpc.employees.create.mutationOptions({
      onSuccess: async () => {
        setForm(emptyEmployeeForm())
        setFormError(null)
        setAddOpen(false)
        mutationSuccess(toast, 'Membre ajouté à l\'équipe')()
        await employees.refetch()
      },
      onError: (error) => {
        setFormError(error.message)
        mutationError(toast, 'Impossible d\'ajouter le membre')(error)
      },
    }),
  )

  const archiveEmployee = useMutation(
    orpc.employees.archive.mutationOptions({
      onSuccess: async () => {
        setPendingArchive(null)
        mutationSuccess(toast, 'Agent archivé')()
        await employees.refetch()
      },
      onError: (error) => {
        mutationError(toast, 'Impossible d\'archiver l\'agent')(error)
      },
    }),
  )

  const reactivateEmployee = useMutation(
    orpc.employees.reactivate.mutationOptions({
      onSuccess: async () => {
        mutationSuccess(toast, 'Agent réactivé')()
        await employees.refetch()
      },
      onError: (error) => {
        mutationError(toast, 'Impossible de réactiver l\'agent')(error)
      },
    }),
  )

  const handleArchive = useCallback((employeeId: string, fullName: string) => {
    setPendingArchive({ id: employeeId, fullName })
  }, [])

  const confirmArchive = useCallback(() => {
    if (!bakeryId || !pendingArchive) return
    archiveEmployee.mutate({
      bakeryId,
      employeeId: pendingArchive.id,
    })
  }, [archiveEmployee, bakeryId, pendingArchive])

  const handleReactivate = useCallback(
    (employeeId: string) => {
      if (!bakeryId) return
      reactivateEmployee.mutate({
        bakeryId,
        employeeId,
      })
    },
    [bakeryId, reactivateEmployee],
  )

  function openAdd() {
    setForm(emptyEmployeeForm())
    setFormError(null)
    setAddOpen(true)
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!bakeryId) return

    const baseSalary = Number.parseInt(form.baseSalary, 10)

    createEmployee.mutate({
      bakeryId,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      role: form.role,
      phone: form.phone.trim() || undefined,
      baseSalary: Number.isFinite(baseSalary) ? baseSalary : undefined,
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

  const hasEmployees = (employees.data?.length ?? 0) > 0

  return (
    <div className="section-stack">
      <HelpNote>
        Vue d&apos;ensemble du personnel. Configurez le salaire et les produits
        vendus par chaque agent dans{' '}
        <Link to="/equipe/remuneration" className="text-link">
          Rémunération
        </Link>
        .
      </HelpNote>

      {hasEmployees ? <EmployeeStatsSummary stats={stats} /> : null}

      <Card
        title="Personnel"
        actions={
          canManage ? (
            <button
              type="button"
              className="btn-primary btn-sm"
              onClick={openAdd}
            >
              <Plus size={16} aria-hidden="true" />
              Ajouter un membre
            </button>
          ) : undefined
        }
      >
        {bakeryLoading || employees.isLoading ? (
          <p className="settings-form__hint">Chargement…</p>
        ) : employees.isError ? (
          <p className="settings-form__error">
            Impossible de charger l&apos;équipe.
          </p>
        ) : !hasEmployees ? (
          <div className="empty-state empty-state--action">
            <p className="empty-state__title">Aucun employé</p>
            <p className="empty-state__hint">
              {canManage
                ? 'Ajoutez votre premier membre pour commencer à organiser les tournées.'
                : 'Aucun membre enregistré pour cette boulangerie.'}
            </p>
            {canManage ? (
              <button
                type="button"
                className="btn-primary btn-sm"
                onClick={openAdd}
              >
                <Plus size={16} aria-hidden="true" />
                Ajouter un membre
              </button>
            ) : null}
          </div>
        ) : (
          <EmployeeDirectoryTable
            rows={visibleRows}
            canManage={canManage}
            showArchived={showArchived}
            onShowArchivedChange={setShowArchived}
            archivingEmployeeId={
              archiveEmployee.isPending ? (pendingArchive?.id ?? null) : null
            }
            reactivatingEmployeeId={
              reactivateEmployee.isPending
                ? (reactivateEmployee.variables?.employeeId ?? null)
                : null
            }
            onArchive={handleArchive}
            onReactivate={handleReactivate}
          />
        )}
      </Card>

      <ConfirmDialog
        open={pendingArchive !== null}
        title="Archiver cet agent ?"
        confirmLabel="Archiver"
        confirmVariant="danger"
        loading={archiveEmployee.isPending}
        onConfirm={confirmArchive}
        onCancel={() => setPendingArchive(null)}
      >
        {pendingArchive ? (
          <p>
            {pendingArchive.fullName} ne sera plus proposé dans les listes
            actives (tournées, avances, paie). L&apos;historique est conservé.
          </p>
        ) : null}
      </ConfirmDialog>

      <Modal
        open={addOpen}
        title="Ajouter un membre"
        description="Renseignez les informations de base. Le salaire et les commissions par produit se configurent dans Rémunération."
        size="lg"
        onClose={() => setAddOpen(false)}
        footer={
          <>
            <button
              type="button"
              className="table-action"
              disabled={createEmployee.isPending}
              onClick={() => setAddOpen(false)}
            >
              Annuler
            </button>
            <button
              type="submit"
              form="add-employee-form"
              className="btn-primary btn-sm"
              disabled={createEmployee.isPending}
            >
              {createEmployee.isPending ? 'Ajout…' : 'Ajouter le membre'}
            </button>
          </>
        }
      >
        <form
          id="add-employee-form"
          className="settings-form settings-form--flush"
          onSubmit={(e) => void handleCreate(e)}
        >
          <div className="settings-form__grid">
            <label className="settings-form__field">
              <span>Prénom</span>
              <input
                value={form.firstName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, firstName: e.target.value }))
                }
                required
                autoFocus
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
                inputMode="tel"
              />
            </label>
            <label className="settings-form__field">
              <span>Salaire de base / mois (XOF)</span>
              <input
                type="number"
                min={0}
                value={form.baseSalary}
                onChange={(e) =>
                  setForm((f) => ({ ...f, baseSalary: e.target.value }))
                }
                placeholder="0"
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
        </form>
      </Modal>
    </div>
  )
}
