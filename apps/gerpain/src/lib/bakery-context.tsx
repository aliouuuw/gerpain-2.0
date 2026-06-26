import { useQuery } from '@tanstack/react-query'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import { getStoredBakeryId, setStoredBakeryId } from '#/lib/bakery-storage'
import { orpc } from '#/lib/orpc-client'

export type BakerySummary = {
  id: string
  name: string
  code: string
  address: string | null
  phone: string | null
}

type BakeryContextValue = {
  bakeries: BakerySummary[]
  bakeryId: string
  bakery: BakerySummary | undefined
  setBakeryId: (id: string) => void
  isLoading: boolean
  isError: boolean
}

const BakeryContext = createContext<BakeryContextValue | null>(null)

export function BakeryProvider({ children }: { children: ReactNode }) {
  const bakeriesQuery = useQuery(orpc.bakeries.list.queryOptions({}))
  const [bakeryId, setBakeryIdState] = useState('')

  useEffect(() => {
    const list = bakeriesQuery.data
    if (!list || list.length === 0) return

    const stored = getStoredBakeryId()
    const match = stored ? list.find((b) => b.id === stored) : undefined
    const next = match?.id ?? list[0]!.id

    setBakeryIdState((current) => {
      if (current && list.some((b) => b.id === current)) return current
      return next
    })
  }, [bakeriesQuery.data])

  const setBakeryId = useCallback((id: string) => {
    setBakeryIdState(id)
    setStoredBakeryId(id)
  }, [])

  const bakery = useMemo(
    () => bakeriesQuery.data?.find((b) => b.id === bakeryId),
    [bakeriesQuery.data, bakeryId],
  )

  const value: BakeryContextValue = {
    bakeries: bakeriesQuery.data ?? [],
    bakeryId,
    bakery,
    setBakeryId,
    isLoading: bakeriesQuery.isLoading,
    isError: bakeriesQuery.isError,
  }

  return (
    <BakeryContext.Provider value={value}>{children}</BakeryContext.Provider>
  )
}

export function useBakery(): BakeryContextValue {
  const ctx = useContext(BakeryContext)
  if (!ctx) {
    throw new Error('useBakery must be used within BakeryProvider')
  }
  return ctx
}
