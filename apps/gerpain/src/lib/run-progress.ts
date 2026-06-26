import {
  groupDeliveryItemsByProduct,
  soldQty,
  type PeriodDraft,
} from '#/lib/delivery-grid'
import { runExpected } from '#/lib/day-operations'

type RunItem = {
  productId: string
  productName: string
  unitPrice: number
  period: string
  quantityEntrusted: number
  quantityReturned: number
}

function periodHasEntry(draft: PeriodDraft | null): boolean {
  if (!draft) return false
  return draft.entrusted > 0 || draft.returned > 0
}

export function runEntryProgress(items: RunItem[]) {
  const withSold = items.map((item) => ({
    ...item,
    quantitySold: Math.max(0, item.quantityEntrusted - item.quantityReturned),
  }))

  const rows = groupDeliveryItemsByProduct(
    withSold.map((item) => ({
      id: `${item.productId}-${item.period}`,
      productId: item.productId,
      productName: item.productName,
      unitPrice: item.unitPrice,
      period: item.period,
      quantityEntrusted: item.quantityEntrusted,
      quantityReturned: item.quantityReturned,
    })),
  )

  const total = rows.length
  let entered = 0
  let totalSold = 0

  for (const row of rows) {
    if (periodHasEntry(row.matin) || periodHasEntry(row.soir)) {
      entered += 1
    }
    totalSold += soldQty(row.matin) + soldQty(row.soir)
  }

  return {
    entered,
    total,
    totalSold,
    expected: runExpected(withSold),
  }
}

export function isProductRowTouched(
  matin: PeriodDraft | null,
  soir: PeriodDraft | null,
): boolean {
  return periodHasEntry(matin) || periodHasEntry(soir)
}
