import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'

import { DayStrip } from '#/components/shell/DayStrip'
import { useBakery } from '#/lib/bakery-context'
import { orpc } from '#/lib/orpc-client'
import { todayIso } from '#/lib/today'
import { useShellBarMode } from '#/lib/use-shell-bar-mode'
import { useShellDate } from '#/lib/use-shell-date'

export function DayContextBar() {
  const { bakery, bakeries, bakeryId, setBakeryId, isLoading, isError } =
    useBakery()
  const { mode, periodLabel } = useShellBarMode()
  const {
    operationalDate,
    urlDate,
    displayLabel,
    isToday,
    setDate,
    goPrev,
    goNext,
    goToday,
  } = useShellDate()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const statusDate = mode === 'home' ? todayIso() : operationalDate
  const showDayQueries = mode === 'day' || mode === 'home'

  const runs = useQuery({
    ...orpc.deliveries.listRuns.queryOptions({
      input: { bakeryId, date: statusDate },
    }),
    enabled: Boolean(bakeryId) && showDayQueries,
  })

  const collections = useQuery({
    ...orpc.collections.list.queryOptions({
      input: { bakeryId, date: statusDate },
    }),
    enabled: Boolean(bakeryId) && showDayQueries,
  })

  useEffect(() => {
    if (!menuOpen) return

    function handlePointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [menuOpen])

  const alerts: string[] = []
  if (showDayQueries && runs.data) {
    const drafts = runs.data.filter((run) => run.status === 'draft').length
    const toValidate = runs.data.filter(
      (run) => run.status !== 'validated' && run.status !== 'draft',
    ).length
    if (toValidate > 0) {
      alerts.push(
        `${toValidate} livraison${toValidate > 1 ? 's' : ''} à valider`,
      )
    }
    if (drafts > 0) {
      alerts.push(`${drafts} brouillon${drafts > 1 ? 's' : ''}`)
    }
  }
  if (showDayQueries && collections.data) {
    const toValidateCollection = collections.data.filter(
      (col) => col.status === 'submitted',
    ).length
    if (toValidateCollection > 0) {
      alerts.push(
        `${toValidateCollection} encaissement${toValidateCollection > 1 ? 's' : ''} à valider`,
      )
    }
  }

  const statusMessage = !showDayQueries
    ? 'Filtres de période sur cette page'
    : runs.data && runs.data.length === 0
      ? 'Aucune tournée pour cette journée'
      : mode === 'home' || statusDate === todayIso()
        ? "Tout est à jour pour aujourd'hui"
        : 'Tout est à jour pour cette journée'

  return (
    <div className="day-context">
      <div className="day-context__row">
        <div className="day-context__left">
          <div className="bakery-picker" ref={menuRef}>
            <button
              type="button"
              className="bakery-btn"
              aria-haspopup="listbox"
              aria-expanded={menuOpen}
              disabled={isLoading || isError || bakeries.length === 0}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <span className="bakery-btn__code">
                {isLoading ? '…' : (bakery?.code ?? '—')}
              </span>
              <span className="bakery-btn__name">
                {isLoading
                  ? 'Chargement…'
                  : isError
                    ? 'Erreur boulangerie'
                    : (bakery?.name ?? 'Aucune boulangerie')}
              </span>
              <span className="bakery-btn__chev" aria-hidden="true">
                ▾
              </span>
            </button>
            {menuOpen && bakeries.length > 0 ? (
              <ul className="bakery-menu" role="listbox" aria-label="Boulangerie">
                {bakeries.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={item.id === bakeryId}
                      className={`bakery-menu__item${item.id === bakeryId ? ' bakery-menu__item--active' : ''}`}
                      onClick={() => {
                        setBakeryId(item.id)
                        setMenuOpen(false)
                      }}
                    >
                      <span className="bakery-menu__code">{item.code}</span>
                      <span className="bakery-menu__name">{item.name}</span>
                      {item.id === bakeryId ? (
                        <span className="bakery-menu__check" aria-hidden="true">
                          ✓
                        </span>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          {mode === 'period' ? (
            <div className="day-context__period">
              <span className="day-context__date-label">Période</span>
              <span className="day-context__period-value">{periodLabel}</span>
            </div>
          ) : mode === 'home' ? (
            <div className="day-context__date">
              <span className="day-context__date-label">Journée</span>
              <time className="day-context__date-value" dateTime={todayIso()}>
                Aujourd&apos;hui
              </time>
            </div>
          ) : (
            <div className="day-context__date-nav">
              <button
                type="button"
                className="day-nav-btn"
                aria-label="Jour précédent"
                onClick={goPrev}
              >
                ◀
              </button>
              <div className="day-context__date">
                <span className="day-context__date-label">Journée du</span>
                <time className="day-context__date-value" dateTime={urlDate}>
                  {displayLabel}
                </time>
                <label className="day-context__date-picker">
                  <span className="sr-only">Choisir une date</span>
                  <input
                    type="date"
                    value={urlDate}
                    onChange={(event) => setDate(event.target.value)}
                  />
                </label>
              </div>
              <button
                type="button"
                className="day-nav-btn"
                aria-label="Jour suivant"
                onClick={goNext}
              >
                ▶
              </button>
              {!isToday ? (
                <button type="button" className="day-today-btn" onClick={goToday}>
                  Aujourd&apos;hui
                </button>
              ) : null}
            </div>
          )}
        </div>
        <div className="day-context__right">
          {showDayQueries && (runs.isLoading || collections.isLoading) ? (
            <p className="day-context__ok">Chargement du jour…</p>
          ) : alerts.length > 0 ? (
            <p className="day-context__alerts" role="status">
              <span className="day-context__alerts-dot" aria-hidden="true" />
              {alerts.join(' · ')}
            </p>
          ) : (
            <p className="day-context__ok">{statusMessage}</p>
          )}
        </div>
      </div>
      {mode === 'day' ? (
        <DayStrip selectedDate={urlDate} onSelectDate={setDate} />
      ) : null}
    </div>
  )
}
