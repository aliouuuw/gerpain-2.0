import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getRouteApi, Link } from '@tanstack/react-router'
import { CheckCircle2, FileDown, Lock, Pencil, Trash2 } from 'lucide-react'
import { Fragment, useMemo, useState } from 'react'

import { Badge } from '#/components/ui/Badge'
import { Card } from '#/components/ui/Card'
import { ConfirmDialog } from '#/components/ui/ConfirmDialog'
import { HelpNote } from '#/components/ui/HelpNote'
import { Modal } from '#/components/ui/Modal'
import { useBakery } from '#/lib/bakery-context'
import { employeeRoleLabel } from '#/lib/employee-labels'
import { formatXof } from '#/lib/format-money'
import { mutationError, mutationSuccess } from '#/lib/mutation-feedback'
import { orpc } from '#/lib/orpc-client'
import {
  formatPeriodLabel,
  periodBounds,
  periodLabelFromEndDate,
  presetLabel,
  type PeriodPreset,
} from '#/lib/period'
import { downloadPayrollCsv } from '#/lib/payroll-csv'
import {
  parseSelectedAgentIds,
  reconcileSelectedAgentIds,
  serializeSelectedAgentIds,
  subsetPayrollPreview,
  totalsFromPayrollLines,
} from '#/lib/payroll-preview-utils'
import {
  downloadPayrollBulletinsPdf,
  downloadPayrollLinePdf,
  downloadPayrollPdf,
} from '#/lib/payroll-pdf'
import type { PayrollPreview } from '#/services/payroll'
import { todayIso } from '#/lib/today'
import { useToast } from '#/lib/toast'
import { usePermissions } from '#/lib/use-permissions'

const routeApi = getRouteApi('/_shell/equipe/paie')

const PAYROLL_GROUP_TABS = [
  { id: 'all', label: 'Tous' },
  { id: 'delivery', label: 'Livreurs' },
  { id: 'salaried', label: 'Salariés' },
] as const
type PayrollGroupFilter = (typeof PAYROLL_GROUP_TABS)[number]['id']

type PayrollLine = {
  employeeId: string
  employeeName: string
  role: string
  baseSalary: number
  commissionAmount: number
  commissionUnitsSold: number
  commissionUnitsCommissioned: number
  commissionValidatedRuns: number
  commissionProducts: Array<{
    productId: string
    productName: string
    unitsSold: number
    commissionPerUnit: number
    commissionAmount: number
  }>
  advanceDeduction: number
  advanceInstallments: Array<{
    id: string
    amount: number
    installmentNumber: number
    duePeriod: string | null
  }>
  bonusAmount: number
  bonuses: Array<{
    id: string
    amount: number
    reason: string | null
    duePeriod: string
  }>
  collectionBalance: {
    totalExpected: number
    totalCollected: number
    solde: number
    collectionCount: number
  } | null
  collectionDeduction: number
  grossAmount: number
  netAmount: number
  advanceInstallmentIds: string[]
  bonusIds: string[]
  lineSource?: 'computed' | 'manual' | 'override'
  manualReason?: string | null
  draftLineId?: string | null
}

type DraftLineForm = {
  employeeId: string
  baseSalary: string
  commissionAmount: string
  bonusAmount: string
  advanceDeduction: string
  collectionDeduction: string
  manualReason: string
}

function parseAmount(value: string): number {
  const parsed = Number.parseInt(value.replace(/\s/g, ''), 10)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
}

function grossFromForm(form: DraftLineForm): number {
  return (
    parseAmount(form.baseSalary) +
    parseAmount(form.commissionAmount) +
    parseAmount(form.bonusAmount)
  )
}

function netFromForm(form: DraftLineForm): number {
  const gross = grossFromForm(form)
  return Math.max(
    gross -
      parseAmount(form.advanceDeduction) -
      parseAmount(form.collectionDeduction),
    0,
  )
}

function lineSourceLabel(source: PayrollLine['lineSource']): string | null {
  if (source === 'manual') return 'Manuelle'
  if (source === 'override') return 'Ajustée'
  return null
}

function computedSnapshotFromLine(line: PayrollLine) {
  return {
    commissionUnitsSold: line.commissionUnitsSold,
    commissionUnitsCommissioned: line.commissionUnitsCommissioned,
    commissionValidatedRuns: line.commissionValidatedRuns,
    commissionProducts: line.commissionProducts,
    bonuses: line.bonuses,
    advanceInstallments: line.advanceInstallments,
    collectionBalance: line.collectionBalance,
    advanceInstallmentIds: line.advanceInstallments.map((row) => row.id),
    bonusIds: line.bonuses.map((row) => row.id),
  }
}

function soldeLabel(solde: number): string {
  if (solde === 0) return 'équilibré'
  if (solde < 0) return 'manque'
  return 'excédent'
}

function soldeClass(solde: number): string {
  if (solde < 0) return 'money-strip__value--warn'
  if (solde > 0) return 'money-strip__value--info'
  return 'money-strip__value--ok'
}

function lineRetenues(line: PayrollLine): number {
  return line.advanceDeduction + line.collectionDeduction
}

function totalsScopeLabel(
  hasSelection: boolean,
  selectedCount: number,
  roleFilter: PayrollGroupFilter,
): string {
  if (hasSelection) {
    return `Sélection (${selectedCount} agent${selectedCount > 1 ? 's' : ''})`
  }
  if (roleFilter === 'delivery') return 'Livreurs'
  if (roleFilter === 'salaried') return 'Salariés'
  return 'Tous les agents'
}

function retenuesMeta(
  advanceDeduction: number,
  collectionDeduction: number,
): string | null {
  const parts: string[] = []
  if (advanceDeduction > 0) {
    parts.push(`avances ${formatXof(advanceDeduction)}`)
  }
  if (collectionDeduction > 0) {
    parts.push(`caisse ${formatXof(collectionDeduction)}`)
  }
  return parts.length > 0 ? parts.join(' · ') : null
}

function ExportMenu({
  exportPreview,
  fullPreview,
  bakeryName,
  endDate,
  hasSelection,
}: {
  exportPreview: PayrollPreview
  fullPreview: PayrollPreview
  bakeryName?: string
  endDate: string
  hasSelection: boolean
}) {
  const suffix = hasSelection ? '-selection' : ''
  const periodSlug = periodLabelFromEndDate(endDate)

  return (
    <details className="export-menu">
      <summary className="btn-secondary btn-sm">Exporter</summary>
      <div className="export-menu__panel" role="menu">
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            downloadPayrollCsv(exportPreview, `paie-${periodSlug}${suffix}.csv`)
          }}
        >
          Tableau CSV ({exportPreview.lines.length})
        </button>
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            downloadPayrollPdf(
              exportPreview,
              bakeryName,
              `paie-${periodSlug}${suffix}.pdf`,
            )
          }}
        >
          Récap PDF ({exportPreview.lines.length})
        </button>
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            downloadPayrollBulletinsPdf(
              fullPreview,
              exportPreview.lines.map((line) => line.employeeId),
              bakeryName,
            )
          }}
        >
          Bulletins PDF — un par agent ({exportPreview.lines.length})
        </button>
      </div>
    </details>
  )
}

function PayrollLineBreakdown({
  line,
  periodPreset,
  startDate,
  endDate,
  showActions,
  onDownloadPdf,
  onEdit,
  onRemoveDraft,
  removeDraftPending,
}: {
  line: PayrollLine
  periodPreset: PeriodPreset
  startDate: string
  endDate: string
  showActions?: boolean
  onDownloadPdf?: () => void
  onEdit?: () => void
  onRemoveDraft?: () => void
  removeDraftPending?: boolean
}) {
  return (
    <>
      {showActions || line.manualReason ? (
        <div className="pay-breakdown__actions">
          {line.manualReason ? (
            <p className="pay-breakdown__reason">{line.manualReason}</p>
          ) : (
            <span />
          )}
          {showActions ? (
            <div className="card-actions-row">
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={onDownloadPdf}
              >
                <FileDown size={14} aria-hidden="true" />
                Bulletin PDF
              </button>
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={onEdit}
              >
                <Pencil size={14} aria-hidden="true" />
                Ajuster
              </button>
              {line.draftLineId ? (
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  disabled={removeDraftPending}
                  onClick={onRemoveDraft}
                >
                  <Trash2 size={14} aria-hidden="true" />
                  Supprimer
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    <dl className="fiche-details pay-breakdown">
      <div className="fiche-details__row">
        <dt>Salaire de base</dt>
        <dd className="num">{formatXof(line.baseSalary)}</dd>
      </div>
      {line.role === 'delivery' ? (
        <div className="fiche-details__row">
          <dt>Commission produits</dt>
          <dd className="num">
            {formatXof(line.commissionAmount)}
            <span className="stats-lines__meta">
              {line.commissionUnitsCommissioned} u. commissionnée
              {line.commissionUnitsCommissioned > 1 ? 's' : ''}
              {line.commissionUnitsSold > line.commissionUnitsCommissioned
                ? ` · ${line.commissionUnitsSold - line.commissionUnitsCommissioned} u. à 0`
                : ''}{' '}
              · {line.commissionValidatedRuns} tournée
              {line.commissionValidatedRuns > 1 ? 's' : ''} validée
              {line.commissionValidatedRuns > 1 ? 's' : ''}
            </span>
          </dd>
        </div>
      ) : null}
      {line.role === 'delivery' && line.commissionProducts.length > 0 ? (
        <div className="pay-breakdown__installments">
          <table className="data-table data-table--compact">
            <thead>
              <tr>
                <th>Produit</th>
                <th className="num">Vendu</th>
                <th className="num">Commission / u</th>
                <th className="num">Sous-total</th>
              </tr>
            </thead>
            <tbody>
              {line.commissionProducts.map((product) => (
                <tr key={product.productId}>
                  <td>{product.productName}</td>
                  <td className="num">{product.unitsSold}</td>
                  <td className="num">
                    {formatXof(product.commissionPerUnit)}
                  </td>
                  <td className="num">
                    {formatXof(product.commissionAmount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {line.bonusAmount > 0 ? (
        <div className="fiche-details__row">
          <dt>Primes</dt>
          <dd className="num">
            + {formatXof(line.bonusAmount)}
            <span className="stats-lines__meta">
              {line.bonuses.length} prime{line.bonuses.length > 1 ? 's' : ''}
            </span>
          </dd>
        </div>
      ) : null}
      {line.bonuses.length > 0 ? (
        <div className="pay-breakdown__installments">
          <table className="data-table data-table--compact">
            <thead>
              <tr>
                <th>Période due</th>
                <th>Motif</th>
                <th className="num">Montant</th>
              </tr>
            </thead>
            <tbody>
              {line.bonuses.map((bonus) => (
                <tr key={bonus.id}>
                  <td>{bonus.duePeriod}</td>
                  <td>{bonus.reason ?? '—'}</td>
                  <td className="num">{formatXof(bonus.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {line.advanceDeduction > 0 ? (
        <div className="fiche-details__row">
          <dt>Retenues avances</dt>
          <dd className="num">
            − {formatXof(line.advanceDeduction)}
            <span className="stats-lines__meta">
              {line.advanceInstallments.length} échéance
              {line.advanceInstallments.length > 1 ? 's' : ''} · déduit du net
            </span>
          </dd>
        </div>
      ) : (
        <div className="fiche-details__row pay-breakdown__info-row">
          <dt>Retenues avances</dt>
          <dd className="num pay-breakdown__muted">Aucune échéance due</dd>
        </div>
      )}
      {line.advanceInstallments.length > 0 ? (
        <div className="pay-breakdown__installments">
          <table className="data-table data-table--compact">
            <thead>
              <tr>
                <th>Échéance</th>
                <th>Période due</th>
                <th className="num">Montant</th>
              </tr>
            </thead>
            <tbody>
              {line.advanceInstallments.map((inst) => (
                <tr key={inst.id}>
                  <td>n° {inst.installmentNumber}</td>
                  <td>{inst.duePeriod ?? '—'}</td>
                  <td className="num">{formatXof(inst.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {line.role === 'delivery' && line.collectionBalance ? (
        <div className="fiche-details__row">
          <dt>
            {line.collectionDeduction > 0
              ? 'Retenue caisse (manque)'
              : 'Solde encaissements'}
          </dt>
          <dd className="num">
            {line.collectionDeduction > 0 ? (
              <>− {formatXof(line.collectionDeduction)}</>
            ) : (
              <span className={soldeClass(line.collectionBalance.solde)}>
                {formatXof(Math.abs(line.collectionBalance.solde))}
                {line.collectionBalance.solde !== 0
                  ? ` (${soldeLabel(line.collectionBalance.solde)})`
                  : ''}
              </span>
            )}
            <span className="stats-lines__meta">
              {formatXof(line.collectionBalance.totalCollected)} collecté sur{' '}
              {formatXof(line.collectionBalance.totalExpected)}
              {line.collectionDeduction > 0 ? ' · déduit du net' : ''}
            </span>
          </dd>
        </div>
      ) : null}
      <div className="fiche-details__row fiche-details__row--emphasis">
        <dt>Net à payer</dt>
        <dd className="num">{formatXof(line.netAmount)}</dd>
      </div>
      <div className="pay-breakdown__links">
        <Link
          to="/equipe/agents/$employeeId"
          params={{ employeeId: line.employeeId }}
          search={{
            tab: 'remuneration',
            period: periodPreset,
            start: periodPreset === 'custom' ? startDate : undefined,
            end: periodPreset === 'custom' ? endDate : undefined,
          }}
          className="text-link"
        >
          Règles de rémunération
        </Link>
        {line.role === 'delivery' ? (
          <>
            <span aria-hidden="true"> · </span>
            <Link
              to="/equipe/agents/$employeeId"
              params={{ employeeId: line.employeeId }}
              search={{
                tab: 'activite',
                period: periodPreset,
                start: periodPreset === 'custom' ? startDate : undefined,
                end: periodPreset === 'custom' ? endDate : undefined,
              }}
              className="text-link"
            >
              Tournées & activité
            </Link>
          </>
        ) : null}
        {line.advanceDeduction > 0 ? (
          <>
            <span aria-hidden="true"> · </span>
            <Link
              to="/equipe/agents/$employeeId"
              params={{ employeeId: line.employeeId }}
              search={{ tab: 'avances' }}
              className="text-link"
            >
              Avances
            </Link>
          </>
        ) : null}
      </div>
    </dl>
    </>
  )
}

export function PaieView() {
  const { bakeryId, bakery, isLoading: bakeryLoading } = useBakery()
  const { canManageCollections: canManage } = usePermissions()
  const toast = useToast()
  const search = routeApi.useSearch()
  const patchNavigate = routeApi.useNavigate()
  const queryClient = useQueryClient()
  const [expandedEmployeeId, setExpandedEmployeeId] = useState<string | null>(
    null,
  )
  const [draftModalOpen, setDraftModalOpen] = useState(false)
  const [editingLine, setEditingLine] = useState<PayrollLine | null>(null)
  const [draftForm, setDraftForm] = useState<DraftLineForm>({
    employeeId: '',
    baseSalary: '0',
    commissionAmount: '0',
    bonusAmount: '0',
    advanceDeduction: '0',
    collectionDeduction: '0',
    manualReason: '',
  })
  const [draftFormError, setDraftFormError] = useState<string | null>(null)
  const [closeModalOpen, setCloseModalOpen] = useState(false)
  const [closeConfirmed, setCloseConfirmed] = useState(false)

  const bakeryDetail = useQuery({
    ...orpc.bakeries.get.queryOptions({ input: { bakeryId } }),
    enabled: Boolean(bakeryId),
  })

  const preset: PeriodPreset =
    search.period ??
    bakeryDetail.data?.settings.defaultPayrollPreset ??
    'month'
  const customStart = search.start ?? todayIso()
  const customEnd = search.end ?? todayIso()
  const roleFilter: PayrollGroupFilter =
    search.group ??
    (search.role === 'delivery' ? 'delivery' : search.role ? 'salaried' : 'all')
  const panel = search.panel ?? 'period'

  const patchSearch = (patch: Partial<typeof search>) => {
    void patchNavigate({
      search: (prev) => ({ ...prev, ...patch }),
      replace: true,
      resetScroll: false,
    })
  }

  const { startDate, endDate } = useMemo(
    () => periodBounds(preset, customStart, customEnd),
    [preset, customStart, customEnd],
  )

  const preview = useQuery({
    ...orpc.payroll.preview.queryOptions({
      input: { bakeryId, startDate, endDate },
    }),
    enabled: Boolean(bakeryId),
  })

  const history = useQuery({
    ...orpc.payroll.list.queryOptions({ input: { bakeryId } }),
    enabled: Boolean(bakeryId),
  })

  const employees = useQuery({
    ...orpc.employees.list.queryOptions({
      input: { bakeryId, status: 'active' },
    }),
    enabled: Boolean(bakeryId),
  })

  const invalidatePreview = () => {
    void preview.refetch()
  }

  const closePayroll = useMutation(
    orpc.payroll.close.mutationOptions({
      onSuccess: () => {
        mutationSuccess(toast, 'Paie clôturée')()
        invalidatePreview()
        void history.refetch()
        void queryClient.invalidateQueries({
          queryKey: orpc.salaryAdvances.list.key(),
        })
      },
      onError: mutationError(toast, 'Impossible de clôturer la paie'),
    }),
  )

  const saveDraftLine = useMutation(
    orpc.payroll.saveDraftLine.mutationOptions({
      onSuccess: () => {
        setDraftModalOpen(false)
        setEditingLine(null)
        setDraftFormError(null)
        mutationSuccess(toast, 'Ligne de paie enregistrée')()
        invalidatePreview()
      },
      onError: (error) => {
        setDraftFormError(error.message)
        mutationError(toast, 'Impossible d\'enregistrer la ligne')(error)
      },
    }),
  )

  const removeDraftLine = useMutation(
    orpc.payroll.removeDraftLine.mutationOptions({
      onSuccess: () => {
        mutationSuccess(toast, 'Ligne retirée du brouillon')()
        invalidatePreview()
      },
      onError: mutationError(toast, 'Impossible de retirer la ligne'),
    }),
  )

  const discardDraft = useMutation(
    orpc.payroll.discardDraft.mutationOptions({
      onSuccess: () => {
        mutationSuccess(toast, 'Brouillon abandonné')()
        invalidatePreview()
      },
      onError: mutationError(toast, 'Impossible d\'abandonner le brouillon'),
    }),
  )

  const lines = (preview.data?.lines ?? []) as PayrollLine[]

  const roleCounts = useMemo(() => {
    let delivery = 0
    let salaried = 0
    for (const line of lines) {
      if (line.role === 'delivery') {
        delivery += 1
      } else {
        salaried += 1
      }
    }
    return {
      all: lines.length,
      delivery,
      salaried,
    }
  }, [lines])

  const visibleLines = useMemo(() => {
    if (roleFilter === 'all') return lines
    if (roleFilter === 'delivery') {
      return lines.filter((line) => line.role === 'delivery')
    }
    return lines.filter((line) => line.role !== 'delivery')
  }, [lines, roleFilter])

  const selectedIds = useMemo(
    () =>
      reconcileSelectedAgentIds(
        parseSelectedAgentIds(search.selected),
        lines.map((line) => line.employeeId),
      ),
    [lines, search.selected],
  )
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds])

  const exportPreview = useMemo(() => {
    if (!preview.data) return null
    const targetIds =
      selectedIds.length > 0
        ? selectedIds
        : visibleLines.map((line) => line.employeeId)
    if (targetIds.length === 0) return null
    return subsetPayrollPreview(preview.data, targetIds)
  }, [preview.data, selectedIds, visibleLines])

  const totals = useMemo(() => {
    if (exportPreview) return exportPreview.totals
    if (roleFilter !== 'all' && visibleLines.length > 0) {
      return totalsFromPayrollLines(visibleLines)
    }
    return preview.data?.totals
  }, [exportPreview, preview.data?.totals, roleFilter, visibleLines])

  const isClosed = preview.data?.isClosed ?? false
  const hasDraft = preview.data?.hasDraft ?? false
  const bakeryName = bakery?.name ?? bakeryDetail.data?.name
  const allVisibleSelected =
    visibleLines.length > 0 &&
    visibleLines.every((line) => selectedIdSet.has(line.employeeId))
  const hasSelection = selectedIds.length > 0

  const adjustedLines = useMemo(
    () =>
      lines.filter(
        (line) =>
          line.lineSource === 'manual' || line.lineSource === 'override',
      ),
    [lines],
  )

  const activeEmployees = employees.data ?? []

  function openEditLineModal(line: PayrollLine) {
    setEditingLine(line)
    setDraftForm({
      employeeId: line.employeeId,
      baseSalary: String(line.baseSalary),
      commissionAmount: String(line.commissionAmount),
      bonusAmount: String(line.bonusAmount),
      advanceDeduction: String(line.advanceDeduction),
      collectionDeduction: String(line.collectionDeduction),
      manualReason: line.manualReason ?? '',
    })
    setDraftFormError(null)
    setDraftModalOpen(true)
  }

  function handleSaveDraftLine() {
    if (!bakeryId) return
    if (!draftForm.employeeId) {
      setDraftFormError('Choisissez un agent.')
      return
    }

    const grossAmount = grossFromForm(draftForm)
    const netAmount = netFromForm(draftForm)
    const existingLine = lines.find(
      (line) => line.employeeId === draftForm.employeeId,
    )
    const source =
      existingLine?.lineSource === 'manual' || (!existingLine && !editingLine)
        ? ('manual' as const)
        : ('override' as const)

    const computedSnapshot =
      source === 'override' && existingLine
        ? computedSnapshotFromLine(
            existingLine.lineSource === 'computed'
              ? existingLine
              : (editingLine ?? existingLine),
          )
        : undefined

    saveDraftLine.mutate({
      bakeryId,
      startDate,
      endDate,
      employeeId: draftForm.employeeId,
      baseSalary: parseAmount(draftForm.baseSalary),
      commissionAmount: parseAmount(draftForm.commissionAmount),
      bonusAmount: parseAmount(draftForm.bonusAmount),
      advanceDeduction: parseAmount(draftForm.advanceDeduction),
      collectionDeduction: parseAmount(draftForm.collectionDeduction),
      grossAmount,
      netAmount,
      manualReason: draftForm.manualReason.trim() || undefined,
      source,
      computedSnapshot,
    })
  }

  function toggleEmployee(employeeId: string) {
    setExpandedEmployeeId((current) =>
      current === employeeId ? null : employeeId,
    )
  }

  function setRoleFilter(group: PayrollGroupFilter) {
    patchSearch({
      group: group === 'all' ? undefined : group,
      role: undefined,
    })
  }

  function toggleSelected(employeeId: string) {
    const next = selectedIdSet.has(employeeId)
      ? selectedIds.filter((id) => id !== employeeId)
      : [...selectedIds, employeeId]
    patchSearch({ selected: serializeSelectedAgentIds(next) })
  }

  function toggleSelectAllVisible() {
    if (allVisibleSelected) {
      const visibleIds = new Set(visibleLines.map((line) => line.employeeId))
      const next = selectedIds.filter((id) => !visibleIds.has(id))
      patchSearch({ selected: serializeSelectedAgentIds(next) })
      return
    }

    const merged = new Set([
      ...selectedIds,
      ...visibleLines.map((line) => line.employeeId),
    ])
    patchSearch({
      selected: serializeSelectedAgentIds([...merged]),
    })
  }

  function clearSelection() {
    patchSearch({ selected: undefined })
  }

  function selectAdjustedLines() {
    if (adjustedLines.length === 0) return
    patchSearch({
      selected: serializeSelectedAgentIds(
        adjustedLines.map((line) => line.employeeId),
      ),
    })
    setExpandedEmployeeId(adjustedLines[0]?.employeeId ?? null)
  }

  function focusAdjustedLines() {
    selectAdjustedLines()
  }

  function setPanel(next: 'period' | 'history') {
    patchSearch({ panel: next === 'history' ? 'history' : undefined })
  }

  function handleClosePayroll() {
    if (!bakeryId || !closeConfirmed) return
    closePayroll.mutate(
      { bakeryId, startDate, endDate },
      {
        onSuccess: () => {
          setCloseModalOpen(false)
          setCloseConfirmed(false)
          setPanel('history')
        },
      },
    )
  }

  const periodTitle = formatPeriodLabel(startDate, endDate)
  const totalsRetenues = totals
    ? totals.advanceDeduction + totals.collectionDeduction
    : 0

  return (
    <div className="section-stack">
      <section className="period-toolbar" aria-label="Filtres paie">
        <div className="period-toolbar__group">
          <span className="period-toolbar__label">Période</span>
          <div className="period-toolbar__presets">
            {(['week', 'month', 'last15', 'custom'] as PeriodPreset[]).map(
              (p) => (
                <button
                  key={p}
                  type="button"
                  className={`preset-btn ${preset === p ? 'preset-btn--active' : ''}`}
                  onClick={() =>
                    patchSearch({ period: p === 'month' ? undefined : p })
                  }
                >
                  {presetLabel(p)}
                </button>
              ),
            )}
          </div>
          {preset === 'custom' && (
            <div className="period-toolbar__custom">
              <input
                type="date"
                value={customStart}
                onChange={(e) =>
                  patchSearch({ start: e.target.value, period: 'custom' })
                }
              />
              <span>à</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) =>
                  patchSearch({ end: e.target.value, period: 'custom' })
                }
              />
            </div>
          )}
        </div>
      </section>

      <HelpNote>
        {periodTitle} — {isClosed ? 'Clôturée' : 'Aperçu avant clôture'}.
        <details className="help-note__details">
          <summary>Comment c&apos;est calculé ?</summary>
          <p>
            Net = salaire de base + commissions + primes − retenues avances −
            manque caisse (si applicable). À la clôture, les encaissements
            validés sont marqués réglés. Dépliez une ligne pour ajuster un
            montant ou télécharger un bulletin.
          </p>
        </details>
      </HelpNote>

      {isClosed ? (
        <div className="status-banner status-banner--success" role="status">
          <span>
            <CheckCircle2
              size={16}
              aria-hidden="true"
              style={{ verticalAlign: 'text-bottom', marginRight: '0.35rem' }}
            />
            Période clôturée — bulletin figé. Consultez l&apos;historique pour
            une période passée.
          </span>
        </div>
      ) : hasDraft ? (
        <div className="status-banner status-banner--info" role="status">
          <span>
            Brouillon — {adjustedLines.length} ligne
            {adjustedLines.length > 1 ? 's' : ''} ajustée
            {adjustedLines.length > 1 ? 's' : ''}. Figées à la clôture.
          </span>
          <div className="status-banner__actions">
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={focusAdjustedLines}
            >
              Voir
            </button>
            <button
              type="button"
              className="btn-secondary btn-sm"
              disabled={discardDraft.isPending}
              onClick={() => {
                if (!bakeryId) return
                discardDraft.mutate({ bakeryId, startDate, endDate })
              }}
            >
              {discardDraft.isPending ? 'Annulation…' : 'Annuler le brouillon'}
            </button>
          </div>
        </div>
      ) : null}

      {canManage && !isClosed ? (
        <div className="pay-close-bar">
          <button
            type="button"
            className="btn-primary btn-sm"
            disabled={
              !bakeryId ||
              preview.isLoading ||
              closePayroll.isPending ||
              lines.length === 0
            }
            onClick={() => {
              setCloseConfirmed(false)
              setCloseModalOpen(true)
            }}
          >
            Clôturer la période
          </button>
        </div>
      ) : null}

      <nav className="fiche-tabs" aria-label="Sections paie">
        <button
          type="button"
          className={`fiche-tabs__tab${panel === 'period' ? ' fiche-tabs__tab--active' : ''}`}
          aria-current={panel === 'period' ? 'page' : undefined}
          onClick={() => setPanel('period')}
        >
          Période en cours
        </button>
        <button
          type="button"
          className={`fiche-tabs__tab${panel === 'history' ? ' fiche-tabs__tab--active' : ''}`}
          aria-current={panel === 'history' ? 'page' : undefined}
          onClick={() => setPanel('history')}
        >
          Historique
        </button>
      </nav>

      {panel === 'period' && totals ? (
        <section aria-label="Synthèse paie">
          <p className="stats-grid__context">
            {totalsScopeLabel(hasSelection, selectedIds.length, roleFilter)} ·{' '}
            {periodTitle}
          </p>
          <div className="stats-grid stats-grid--3">
            <dl className="stats-grid__col">
              <div className="stats-lines__row">
                <dt>Net à payer</dt>
                <dd>{formatXof(totals.net)}</dd>
              </div>
            </dl>
            <dl className="stats-grid__col">
              <div className="stats-lines__row">
                <dt>Brut total</dt>
                <dd>{formatXof(totals.gross)}</dd>
              </div>
            </dl>
            <dl className="stats-grid__col">
              <div className="stats-lines__row">
                <dt>Retenues</dt>
                <dd>
                  {formatXof(totalsRetenues)}
                  {retenuesMeta(
                    totals.advanceDeduction,
                    totals.collectionDeduction,
                  ) ? (
                    <span className="stats-lines__meta">
                      {retenuesMeta(
                        totals.advanceDeduction,
                        totals.collectionDeduction,
                      )}
                    </span>
                  ) : null}
                </dd>
              </div>
            </dl>
          </div>
        </section>
      ) : null}

      {panel === 'period' && hasSelection && exportPreview ? (
        <div className="selection-bar" role="status">
          <span className="selection-bar__count">
            {selectedIds.length} agent{selectedIds.length > 1 ? 's' : ''}{' '}
            sélectionné{selectedIds.length > 1 ? 's' : ''}
          </span>
          <ExportMenu
            exportPreview={exportPreview}
            fullPreview={preview.data!}
            bakeryName={bakeryName}
            endDate={endDate}
            hasSelection
          />
          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={clearSelection}
          >
            Effacer
          </button>
          {adjustedLines.length > 0 ? (
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={selectAdjustedLines}
            >
              Sélectionner les ajustées
            </button>
          ) : null}
        </div>
      ) : null}

      {panel === 'period' ? (
      <Card
        title="Lignes de paie"
        actions={
          <div className="card-actions-row">
            {exportPreview && exportPreview.lines.length > 0 && preview.data ? (
              <ExportMenu
                exportPreview={exportPreview}
                fullPreview={preview.data}
                bakeryName={bakeryName}
                endDate={endDate}
                hasSelection={hasSelection}
              />
            ) : null}
            {isClosed ? (
              <span className="settings-form__hint">
                <Lock size={14} aria-hidden="true" /> Clôturée
              </span>
            ) : null}
          </div>
        }
      >
        {!bakeryId || bakeryLoading || preview.isLoading ? (
          <p className="empty-state">Chargement…</p>
        ) : preview.isError ? (
          <p className="empty-state">Impossible de charger l&apos;aperçu paie.</p>
        ) : lines.length === 0 ? (
          <p className="empty-state">Aucun agent actif pour cette période.</p>
        ) : (
          <>
            <div className="data-table-toolbar" aria-label="Filtre par rôle">
              <div className="pay-toolbar-tabs">
                {PAYROLL_GROUP_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    className={`preset-btn${roleFilter === tab.id ? ' preset-btn--active' : ''}`}
                    onClick={() => setRoleFilter(tab.id)}
                  >
                    {tab.label} ({roleCounts[tab.id]})
                  </button>
                ))}
              </div>
            </div>
            {visibleLines.length === 0 ? (
              <p className="empty-state">
                {roleFilter === 'delivery'
                  ? 'Aucun livreur sur cette période.'
                  : roleFilter === 'salaried'
                    ? 'Aucun salarié sur cette période.'
                    : 'Aucun agent sur cette période.'}
              </p>
            ) : (
              <div className="table-wrap">
            <table className="data-table data-table--expandable">
              <thead>
                <tr>
                  <th className="data-table__check-col">
                    <input
                      type="checkbox"
                      aria-label="Sélectionner les agents visibles"
                      checked={allVisibleSelected}
                      onChange={toggleSelectAllVisible}
                    />
                  </th>
                  <th>Agent</th>
                  <th>Rôle</th>
                  <th className="num">Brut</th>
                  <th className="num">Retenues</th>
                  <th className="num">Net à payer</th>
                  <th aria-hidden="true" />
                </tr>
              </thead>
              <tbody>
                {visibleLines.map((line) => {
                  const isExpanded = expandedEmployeeId === line.employeeId
                  const sourceLabel = lineSourceLabel(line.lineSource)
                  const isSelected = selectedIdSet.has(line.employeeId)
                  const retenues = lineRetenues(line)
                  return (
                    <Fragment key={line.employeeId}>
                      <tr
                        className={`data-table__row--clickable${isExpanded ? ' data-table__row--selected' : ''}`}
                        onClick={() => toggleEmployee(line.employeeId)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            toggleEmployee(line.employeeId)
                          }
                        }}
                        tabIndex={0}
                        role="button"
                        aria-expanded={isExpanded}
                      >
                        <td
                          className="data-table__check-col"
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            aria-label={`Sélectionner ${line.employeeName}`}
                            checked={isSelected}
                            onChange={() => toggleSelected(line.employeeId)}
                          />
                        </td>
                        <td>
                          {line.employeeName}
                          {sourceLabel ? (
                            <>
                              {' '}
                              <Badge variant="info">{sourceLabel}</Badge>
                            </>
                          ) : null}
                        </td>
                        <td>
                          <Badge variant="neutral">
                            {employeeRoleLabel(line.role)}
                          </Badge>
                        </td>
                        <td className="num">{formatXof(line.grossAmount)}</td>
                        <td className="num">
                          {retenues > 0 ? formatXof(retenues) : '—'}
                        </td>
                        <td className="num">{formatXof(line.netAmount)}</td>
                        <td className="status-cell__chevron">
                          {isExpanded ? '▲' : '▼'}
                        </td>
                      </tr>
                      {isExpanded ? (
                        <tr className="data-table__expand-row">
                          <td colSpan={7}>
                            <PayrollLineBreakdown
                              line={line}
                              periodPreset={preset}
                              startDate={startDate}
                              endDate={endDate}
                              showActions={canManage && !isClosed}
                              onDownloadPdf={() => {
                                if (!preview.data) return
                                downloadPayrollLinePdf(
                                  preview.data,
                                  line.employeeId,
                                  bakeryName,
                                )
                              }}
                              onEdit={() => openEditLineModal(line)}
                              onRemoveDraft={
                                line.draftLineId && bakeryId
                                  ? () => {
                                      removeDraftLine.mutate({
                                        bakeryId,
                                        startDate,
                                        endDate,
                                        lineId: line.draftLineId!,
                                      })
                                    }
                                  : undefined
                              }
                              removeDraftPending={removeDraftLine.isPending}
                            />
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
            )}
          </>
        )}
        {closePayroll.isError ? (
          <p className="settings-form__error">{closePayroll.error.message}</p>
        ) : null}
      </Card>
      ) : null}

      <Modal
        open={draftModalOpen}
        title={editingLine ? 'Ajuster la ligne de paie' : 'Ligne de paie'}
        onClose={() => {
          setDraftModalOpen(false)
          setEditingLine(null)
          setDraftFormError(null)
        }}
      >
        <div className="settings-form">
          <label className="settings-form__field">
            <span>Agent</span>
            <select
              value={draftForm.employeeId}
              disabled={Boolean(editingLine)}
              onChange={(e) =>
                setDraftForm((current) => ({
                  ...current,
                  employeeId: e.target.value,
                }))
              }
            >
              <option value="">— Choisir —</option>
              {(editingLine
                ? activeEmployees.filter(
                    (employee) => employee.id === editingLine.employeeId,
                  )
                : activeEmployees
              ).map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.fullName}
                </option>
              ))}
            </select>
          </label>
          <label className="settings-form__field">
            <span>Salaire de base (XOF)</span>
            <input
              type="text"
              inputMode="numeric"
              value={draftForm.baseSalary}
              onChange={(e) =>
                setDraftForm((current) => ({
                  ...current,
                  baseSalary: e.target.value,
                }))
              }
            />
          </label>
          <label className="settings-form__field">
            <span>Commission (XOF)</span>
            <input
              type="text"
              inputMode="numeric"
              value={draftForm.commissionAmount}
              onChange={(e) =>
                setDraftForm((current) => ({
                  ...current,
                  commissionAmount: e.target.value,
                }))
              }
            />
          </label>
          <label className="settings-form__field">
            <span>Primes (XOF)</span>
            <input
              type="text"
              inputMode="numeric"
              value={draftForm.bonusAmount}
              onChange={(e) =>
                setDraftForm((current) => ({
                  ...current,
                  bonusAmount: e.target.value,
                }))
              }
            />
          </label>
          <label className="settings-form__field">
            <span>Retenue avances (XOF)</span>
            <input
              type="text"
              inputMode="numeric"
              value={draftForm.advanceDeduction}
              onChange={(e) =>
                setDraftForm((current) => ({
                  ...current,
                  advanceDeduction: e.target.value,
                }))
              }
            />
          </label>
          <label className="settings-form__field">
            <span>Retenue caisse (XOF)</span>
            <input
              type="text"
              inputMode="numeric"
              value={draftForm.collectionDeduction}
              onChange={(e) =>
                setDraftForm((current) => ({
                  ...current,
                  collectionDeduction: e.target.value,
                }))
              }
            />
          </label>
          <div className="settings-form__field">
            <span>Brut calculé</span>
            <p className="num">{formatXof(grossFromForm(draftForm))}</p>
          </div>
          <div className="settings-form__field">
            <span>Net calculé</span>
            <p className="num">{formatXof(netFromForm(draftForm))}</p>
          </div>
          <label className="settings-form__field">
            <span>Motif (optionnel)</span>
            <input
              type="text"
              value={draftForm.manualReason}
              onChange={(e) =>
                setDraftForm((current) => ({
                  ...current,
                  manualReason: e.target.value,
                }))
              }
            />
          </label>
          {draftFormError ? (
            <p className="settings-form__error">{draftFormError}</p>
          ) : null}
          {saveDraftLine.isError ? (
            <p className="settings-form__error">{saveDraftLine.error.message}</p>
          ) : null}
          <div className="settings-form__actions">
            <button
              type="button"
              className="btn-primary"
              disabled={saveDraftLine.isPending}
              onClick={handleSaveDraftLine}
            >
              {saveDraftLine.isPending ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={closeModalOpen}
        title="Clôturer la période"
        confirmLabel="Clôturer définitivement"
        loading={closePayroll.isPending}
        confirmDisabled={!closeConfirmed}
        onCancel={() => {
          setCloseModalOpen(false)
          setCloseConfirmed(false)
        }}
        onConfirm={handleClosePayroll}
      >
        <p>
          Période <strong>{periodTitle}</strong> — {lines.length} agent
          {lines.length > 1 ? 's' : ''}, net total{' '}
          <strong>{formatXof(preview.data?.totals.net ?? 0)}</strong>.
        </p>
        {adjustedLines.length > 0 ? (
          <>
            <p>Lignes ajustées incluses dans la clôture :</p>
            <ul>
              {adjustedLines.map((line) => (
                <li key={line.employeeId}>
                  {line.employeeName} — {formatXof(line.netAmount)}
                </li>
              ))}
            </ul>
          </>
        ) : null}
        <p>
          Les encaissements validés seront marqués réglés. Cette action est
          irréversible.
        </p>
        <label className="period-toolbar__checkbox">
          <input
            type="checkbox"
            checked={closeConfirmed}
            onChange={(e) => setCloseConfirmed(e.target.checked)}
          />
          Je confirme la clôture de cette période
        </label>
        {closePayroll.isError ? (
          <p className="settings-form__error">{closePayroll.error.message}</p>
        ) : null}
      </ConfirmDialog>

      {panel === 'history' ? (
      <Card title="Historique des clôtures">
        {history.isLoading ? (
          <p className="empty-state">Chargement…</p>
        ) : !history.data || history.data.length === 0 ? (
          <p className="empty-state">Aucune clôture enregistrée.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table data-table--expandable">
              <thead>
                <tr>
                  <th>Période</th>
                  <th>Libellé</th>
                  <th className="num">Agents</th>
                  <th className="num">Brut</th>
                  <th className="num">Net</th>
                  <th>Clôturée le</th>
                </tr>
              </thead>
              <tbody>
                {history.data.map((run) => {
                  const isSelected = search.runId === run.id
                  return (
                    <tr
                      key={run.id}
                      className={`data-table__row--clickable${isSelected ? ' data-table__row--selected' : ''}`}
                      onClick={() => {
                        void patchNavigate({
                          search: {
                            period: 'custom',
                            start: run.startDate,
                            end: run.endDate,
                            runId: run.id,
                            panel: undefined,
                          },
                          replace: true,
                        })
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          void patchNavigate({
                            search: {
                              period: 'custom',
                              start: run.startDate,
                              end: run.endDate,
                              runId: run.id,
                              panel: undefined,
                            },
                            replace: true,
                          })
                        }
                      }}
                      tabIndex={0}
                      role="button"
                      aria-current={isSelected ? 'true' : undefined}
                    >
                      <td>{formatPeriodLabel(run.startDate, run.endDate)}</td>
                      <td>{run.periodLabel}</td>
                      <td className="num">{run.employeeCount}</td>
                      <td className="num">{formatXof(run.totalGross)}</td>
                      <td className="num">{formatXof(run.totalNet)}</td>
                      <td>
                        {run.closedAt
                          ? new Intl.DateTimeFormat('fr-FR', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            }).format(new Date(run.closedAt))
                          : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="settings-form__hint" style={{ marginTop: '0.75rem' }}>
          Cliquez sur une ligne pour afficher le bulletin figé de la clôture.
        </p>
      </Card>
      ) : null}
    </div>
  )
}
