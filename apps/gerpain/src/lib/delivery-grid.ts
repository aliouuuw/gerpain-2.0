export type PeriodDraft = {
  itemId: string
  entrusted: number
  returned: number
}

export type ProductDeliveryRow = {
  productId: string
  productName: string
  productSortOrder: number
  unitPrice: number
  matin: PeriodDraft | null
  soir: PeriodDraft | null
}

type DeliveryItemLike = {
  id: string
  productId: string
  productName: string
  productSortOrder?: number
  unitPrice: number
  period: string
  quantityEntrusted: number
  quantityReturned: number
}

export function groupDeliveryItemsByProduct(
  items: DeliveryItemLike[],
): ProductDeliveryRow[] {
  const byProduct = new Map<string, ProductDeliveryRow>()

  for (const item of items) {
    let row = byProduct.get(item.productId)
    if (!row) {
      row = {
        productId: item.productId,
        productName: item.productName,
        productSortOrder: item.productSortOrder ?? 0,
        unitPrice: item.unitPrice,
        matin: null,
        soir: null,
      }
      byProduct.set(item.productId, row)
    }

    const draft: PeriodDraft = {
      itemId: item.id,
      entrusted: item.quantityEntrusted,
      returned: item.quantityReturned,
    }

    if (item.period.toLowerCase() === 'matin') {
      row.matin = draft
    }
    if (item.period.toLowerCase() === 'soir') {
      row.soir = draft
    }
  }

  return [...byProduct.values()].sort((a, b) => {
    if (a.productSortOrder !== b.productSortOrder) {
      return a.productSortOrder - b.productSortOrder
    }
    return a.productName.localeCompare(b.productName, 'fr')
  })
}

export function soldQty(draft: PeriodDraft | null): number {
  if (!draft) return 0
  return Math.max(0, draft.entrusted - draft.returned)
}

export function lineTotal(draft: PeriodDraft | null, unitPrice: number): number {
  return soldQty(draft) * unitPrice
}
