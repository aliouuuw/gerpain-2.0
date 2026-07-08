import { Link } from '@tanstack/react-router'
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import { ChevronDown, ChevronUp, Search } from 'lucide-react'
import { useMemo, useState } from 'react'

import { Badge } from '#/components/ui/Badge'
import {
  employeeInitials,
  employeeRoleLabel,
  employeeStatusLabel,
} from '#/lib/employee-labels'
import { formatXof } from '#/lib/format-money'

export type EmployeeDirectoryRow = {
  id: string
  firstName: string
  lastName: string
  fullName: string
  phone: string | null
  role: string
  status: string
  baseSalary: number | null
  productCount: number
  locationLabel: string
}

type EmployeeDirectoryTableProps = {
  rows: EmployeeDirectoryRow[]
  canManage: boolean
  showArchived: boolean
  onShowArchivedChange: (show: boolean) => void
  archivingEmployeeId: string | null
  reactivatingEmployeeId: string | null
  onArchive: (employeeId: string, fullName: string) => void
  onReactivate: (employeeId: string) => void
}

const PAGE_SIZES = [10, 25, 50] as const
const NUM_COLUMNS = new Set(['baseSalary', 'productCount'])

function SortHeader({
  label,
  sorted,
}: {
  label: string
  sorted: false | 'asc' | 'desc'
}) {
  return (
    <span className="data-table__sort-header">
      {label}
      {sorted === 'asc' ? (
        <ChevronUp size={14} aria-hidden="true" />
      ) : sorted === 'desc' ? (
        <ChevronDown size={14} aria-hidden="true" />
      ) : null}
    </span>
  )
}

export function EmployeeDirectoryTable({
  rows,
  canManage,
  showArchived,
  onShowArchivedChange,
  archivingEmployeeId,
  reactivatingEmployeeId,
  onArchive,
  onReactivate,
}: EmployeeDirectoryTableProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'fullName', desc: false },
  ])
  const [globalFilter, setGlobalFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>(
    'active',
  )

  const filteredRows = useMemo(() => {
    if (statusFilter === 'all') return rows
    return rows.filter((row) => row.status === statusFilter)
  }, [rows, statusFilter])

  const columns = useMemo<ColumnDef<EmployeeDirectoryRow>[]>(() => {
    const base: ColumnDef<EmployeeDirectoryRow>[] = [
      {
        id: 'fullName',
        accessorKey: 'fullName',
        header: 'Agent',
        cell: ({ row }) => (
          <div className="agent-lockup">
            <div className="avatar--sm">
              {employeeInitials(row.original.firstName, row.original.lastName)}
            </div>
            <Link
              to="/equipe/agents/$employeeId"
              params={{ employeeId: row.original.id }}
              className="agent-name text-link"
            >
              {row.original.fullName}
            </Link>
          </div>
        ),
      },
      {
        id: 'role',
        accessorKey: 'role',
        header: 'Rôle',
        cell: ({ getValue }) => (
          <Badge variant="neutral">{employeeRoleLabel(String(getValue()))}</Badge>
        ),
        sortingFn: (a, b) =>
          employeeRoleLabel(a.original.role).localeCompare(
            employeeRoleLabel(b.original.role),
            'fr',
          ),
      },
      {
        id: 'phone',
        accessorKey: 'phone',
        header: 'Téléphone',
        cell: ({ getValue }) => (
          <span className="cell-nowrap">{getValue<string | null>() ?? '—'}</span>
        ),
      },
      {
        id: 'locationLabel',
        accessorKey: 'locationLabel',
        header: 'Lieux',
        cell: ({ getValue }) => getValue<string>() || '—',
      },
      {
        id: 'baseSalary',
        accessorKey: 'baseSalary',
        header: 'Salaire / mois',
        cell: ({ getValue }) => {
          const value = getValue<number | null>()
          return value ? formatXof(value) : '—'
        },
      },
      {
        id: 'productCount',
        accessorKey: 'productCount',
        header: 'Produits',
        cell: ({ row }) =>
          row.original.productCount > 0 ? row.original.productCount : '—',
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: 'Statut',
        cell: ({ getValue }) =>
          getValue<string>() === 'inactive' ? (
            <Badge variant="warning">{employeeStatusLabel('inactive')}</Badge>
          ) : (
            <Badge variant="success">{employeeStatusLabel('active')}</Badge>
          ),
      },
    ]

    if (canManage) {
      base.push({
        id: 'actions',
        header: '',
        enableSorting: false,
        cell: ({ row }) => {
          const isArchiving = archivingEmployeeId === row.original.id
          const isReactivating = reactivatingEmployeeId === row.original.id

          return (
            <div className="table-actions">
              <Link
                to="/equipe/remuneration"
                search={{ employee: row.original.id }}
                className="table-action"
              >
                Rémunération
              </Link>
              {row.original.status === 'active' ? (
                <button
                  type="button"
                  className="table-action table-action--danger"
                  disabled={Boolean(archivingEmployeeId)}
                  onClick={() =>
                    onArchive(row.original.id, row.original.fullName)
                  }
                >
                  {isArchiving ? 'Archivage…' : 'Archiver'}
                </button>
              ) : (
                <button
                  type="button"
                  className="table-action table-action--primary"
                  disabled={Boolean(reactivatingEmployeeId)}
                  onClick={() => onReactivate(row.original.id)}
                >
                  {isReactivating ? 'Réactivation…' : 'Réactiver'}
                </button>
              )}
            </div>
          )
        },
      })
    }

    return base
  }, [
    archivingEmployeeId,
    canManage,
    onArchive,
    onReactivate,
    reactivatingEmployeeId,
  ])

  const table = useReactTable({
    data: filteredRows,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: (row, _columnId, filterValue) => {
      const query = String(filterValue).trim().toLowerCase()
      if (!query) return true
      const item = row.original
      const haystack = [
        item.fullName,
        item.phone ?? '',
        employeeRoleLabel(item.role),
        item.locationLabel,
        employeeStatusLabel(item.status).toLowerCase(),
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(query)
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize: 10 },
    },
  })

  const pageCount = table.getPageCount()
  const pageIndex = table.getState().pagination.pageIndex
  const pageSize = table.getState().pagination.pageSize
  const filteredCount = table.getFilteredRowModel().rows.length

  return (
    <div className="data-table-panel">
      <div className="data-table-toolbar">
        <label className="data-table-toolbar__search">
          <Search size={16} aria-hidden="true" />
          <input
            type="search"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Rechercher un agent, rôle, téléphone…"
            aria-label="Rechercher dans le personnel"
          />
        </label>
        <div className="data-table-toolbar__filters">
          <label className="data-table-toolbar__filter">
            <span>Statut</span>
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')
              }
            >
              <option value="active">Actifs</option>
              <option value="inactive">Archivés</option>
              <option value="all">Tous</option>
            </select>
          </label>
          <label className="settings-checkbox data-table-toolbar__checkbox">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => onShowArchivedChange(e.target.checked)}
            />
            Inclure les archivés dans la liste
          </label>
        </div>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort()
                  const isNum = NUM_COLUMNS.has(header.column.id)
                  return (
                    <th
                      key={header.id}
                      className={isNum ? 'num' : undefined}
                      aria-sort={
                        canSort && header.column.getIsSorted()
                          ? header.column.getIsSorted() === 'asc'
                            ? 'ascending'
                            : 'descending'
                          : undefined
                      }
                    >
                      {header.isPlaceholder ? null : canSort ? (
                        <button
                          type="button"
                          className="data-table__sort-btn"
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          <SortHeader
                            label={String(header.column.columnDef.header)}
                            sorted={header.column.getIsSorted()}
                          />
                        </button>
                      ) : (
                        flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )
                      )}
                    </th>
                  )
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="data-table__empty">
                  {statusFilter === 'inactive'
                    ? 'Aucun agent archivé.'
                    : 'Aucun résultat pour cette recherche.'}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id}>
                  {row.getVisibleCells().map((cell) => {
                    const isNum = NUM_COLUMNS.has(cell.column.id)
                    return (
                      <td
                        key={cell.id}
                        className={isNum ? 'num' : undefined}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="data-table-footer">
        <p className="data-table-footer__count">
          {filteredCount} agent{filteredCount > 1 ? 's' : ''}
          {globalFilter ? ' (filtrés)' : ''}
        </p>
        <div className="data-table-footer__pagination">
          <label className="data-table-footer__page-size">
            <span>Par page</span>
            <select
              value={pageSize}
              onChange={(e) => table.setPageSize(Number(e.target.value))}
            >
              {PAGE_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
          <span className="data-table-footer__page-info">
            Page {pageCount === 0 ? 0 : pageIndex + 1} / {pageCount || 1}
          </span>
          <button
            type="button"
            className="table-action"
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
          >
            Précédent
          </button>
          <button
            type="button"
            className="table-action"
            disabled={!table.getCanNextPage()}
            onClick={() => table.nextPage()}
          >
            Suivant
          </button>
        </div>
      </div>
    </div>
  )
}
