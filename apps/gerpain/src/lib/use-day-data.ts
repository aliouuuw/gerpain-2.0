import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import {
  buildAgentDayRows,
  buildHomeTasks,
  computeDayMoneyStats,
} from '#/lib/day-operations'
import { useBakery } from '#/lib/bakery-context'
import { orpc } from '#/lib/orpc-client'
import { todayIso } from '#/lib/today'

export function useDayData(date = todayIso()) {
  const { bakeryId, isLoading: bakeryLoading } = useBakery()

  const runs = useQuery({
    ...orpc.deliveries.listRuns.queryOptions({
      input: { bakeryId, date },
    }),
    enabled: Boolean(bakeryId),
  })

  const collections = useQuery({
    ...orpc.collections.list.queryOptions({
      input: { bakeryId, date },
    }),
    enabled: Boolean(bakeryId),
  })

  const stats = useMemo(
    () => computeDayMoneyStats(collections.data ?? []),
    [collections.data],
  )

  const tasks = useMemo(
    () => buildHomeTasks(runs.data ?? [], collections.data ?? []),
    [runs.data, collections.data],
  )

  const agents = useMemo(
    () => buildAgentDayRows(runs.data ?? [], collections.data ?? []),
    [runs.data, collections.data],
  )

  return {
    runs,
    collections,
    stats,
    tasks,
    agents,
    isLoading: bakeryLoading || runs.isLoading || collections.isLoading,
    isError: runs.isError || collections.isError,
  }
}
