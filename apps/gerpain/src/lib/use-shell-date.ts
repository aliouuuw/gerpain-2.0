import { useNavigate, useRouterState } from '@tanstack/react-router'

import {
  formatDateLabel,
  shiftDate,
  shellSearchSchema,
  type ShellSearch,
} from '#/lib/shell-date'
import { todayIso } from '#/lib/today'

function parseShellSearch(search: Record<string, unknown>): ShellSearch {
  const parsed = shellSearchSchema.safeParse(search)
  return parsed.success ? parsed.data : {}
}

export function useShellDate() {
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const rawSearch = useRouterState({ select: (s) => s.location.search })
  const search = parseShellSearch(rawSearch as Record<string, unknown>)

  const isHome = pathname === '/'
  const urlDate = search.date ?? todayIso()
  const operationalDate = isHome ? todayIso() : urlDate
  const isToday = urlDate === todayIso()

  function setDate(date: string | undefined) {
    const nextSearch: ShellSearch =
      !date || date === todayIso() ? {} : { date }

    void navigate({
      to: pathname,
      search: nextSearch,
      replace: true,
    })
  }

  function goPrev() {
    setDate(shiftDate(urlDate, -1))
  }

  function goNext() {
    setDate(shiftDate(urlDate, 1))
  }

  function goToday() {
    setDate(undefined)
  }

  return {
    operationalDate,
    urlDate,
    displayLabel: formatDateLabel(urlDate),
    isToday,
    isHome,
    setDate,
    goPrev,
    goNext,
    goToday,
    search,
  }
}
