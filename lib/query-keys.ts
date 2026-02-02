export const queryKeys = {
  deliveries: {
    all: ["deliveries"] as const,
    runs: (params: { date: string; locationId?: string; employeeId?: string }) =>
      ["deliveries", "runs", params] as const,
    run: (id: string) => ["deliveries", "run", id] as const,
  },
  sales: {
    transactions: (params?: { date?: string; locationId?: string }) =>
      ["sales", "transactions", params ?? {}] as const,
  },
  inventory: {
    items: (params?: { locationId?: string }) =>
      ["inventory", "items", params ?? {}] as const,
  },
  cash: {
    all: ["collections"] as const,
    collections: (params?: { date?: string; locationId?: string; status?: string }) =>
      ["cash", "collections", params ?? {}] as const,
    collection: (id: string) => ["cash", "collection", id] as const,
    reconciliations: (params?: { date?: string; locationId?: string }) =>
      ["cash", "reconciliations", params ?? {}] as const,
  },
  employees: {
    all: ["employees"] as const,
    list: (params?: { locationId?: string; role?: string; status?: string }) =>
      ["employees", "list", params ?? {}] as const,
    detail: (id: string) => ["employees", "detail", id] as const,
    performance: (id: string, params: { startDate: string; endDate: string }) =>
      ["employees", "performance", id, params] as const,
  },
} as const;
