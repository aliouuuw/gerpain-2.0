import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import { useBakery } from '#/lib/bakery-context'
import { orpc } from '#/lib/orpc-client'
import type { DayActivityRow } from '#/services/day-activity'
import { weekBounds, weekRange } from '#/lib/shell-date'
import { todayIso } from '#/lib/today'

type DayStripProps = {
  selectedDate: string
  onSelectDate: (date: string) => void
}

function weekdayLabel(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('fr-FR', {
    weekday: 'short',
  })
}

function dayNumber(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('fr-FR', {
    day: 'numeric',
  })
}

export function DayStrip({ selectedDate, onSelectDate }: DayStripProps) {
  const { bakeryId } = useBakery()
  const weekDays = useMemo(() => weekRange(selectedDate), [selectedDate])
  const bounds = useMemo(() => weekBounds(selectedDate), [selectedDate])

  const activity = useQuery({
    ...orpc.dashboard.dayActivity.queryOptions({
      input: {
        bakeryId,
        startDate: bounds.startDate,
        endDate: bounds.endDate,
      },
    }),
    enabled: Boolean(bakeryId),
  })

  const activityByDate = useMemo(() => {
    const map = new Map<string, DayActivityRow>()
    for (const row of activity.data ?? []) {
      map.set(row.date, row)
    }
    return map
  }, [activity.data])

  return (
    <div className="day-strip" role="group" aria-label="Semaine">
      {weekDays.map((iso) => {
        const row = activityByDate.get(iso)
        const isSelected = iso === selectedDate
        const isToday = iso === todayIso()
        const hasDeliveries = (row?.deliveryRuns ?? 0) > 0
        const hasWorked = (row?.deliveriesWorked ?? 0) > 0
        const hasCollections = (row?.collections ?? 0) > 0

        return (
          <button
            key={iso}
            type="button"
            className={`day-strip__day${isSelected ? ' day-strip__day--selected' : ''}${isToday ? ' day-strip__day--today' : ''}`}
            aria-pressed={isSelected}
            aria-label={`${weekdayLabel(iso)} ${dayNumber(iso)}`}
            onClick={() => onSelectDate(iso)}
          >
            <span className="day-strip__weekday">{weekdayLabel(iso)}</span>
            <span className="day-strip__num">{dayNumber(iso)}</span>
            <span className="day-strip__dots" aria-hidden="true">
              {hasDeliveries ? (
                <span
                  className={`day-strip__dot day-strip__dot--delivery${hasWorked ? ' day-strip__dot--strong' : ''}`}
                />
              ) : null}
              {hasCollections ? (
                <span className="day-strip__dot day-strip__dot--collection" />
              ) : null}
            </span>
          </button>
        )
      })}
    </div>
  )
}
