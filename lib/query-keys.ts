export const queryKeys = {
  sales: {
    transactions: (params?: { date?: string; locationId?: string }) =>
      ["sales", "transactions", params ?? {}] as const,
  },
  inventory: {
    items: (params?: { locationId?: string }) =>
      ["inventory", "items", params ?? {}] as const,
  },
  cash: {
    collections: (params?: { date?: string; locationId?: string }) =>
      ["cash", "collections", params ?? {}] as const,
    reconciliations: (params?: { date?: string; locationId?: string }) =>
      ["cash", "reconciliations", params ?? {}] as const,
  },
  employees: {
    list: (params?: { locationId?: string }) =>
      ["employees", "list", params ?? {}] as const,
  },
} as const;
