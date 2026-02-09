export const siteConfig = {
  name: "Gerpain ERP",
  url: "https://gerpain.com",
  description: "Système de gestion pour chaînes de boulangeries",
  baseLinks: {
    dashboard: "/dashboard",
    production: {
      planning: "/production/planning",
      recipes: "/production/recipes",
      stock: "/production/stock",
    },
    sales: {
      overview: "/sales",
      deliveries: "/sales/deliveries",
      transactions: "/sales/transactions",
      products: "/sales/products",
    },
    inventory: {
      overview: "/inventory",
      adjustments: "/inventory/adjustments",
      transfers: "/inventory/transfers",
    },
    cash: {
      overview: "/cash",
      collections: "/cash/collections",
      reconciliations: "/cash/reconciliations",
    },
    employees: {
      overview: "/employees",
      list: "/employees/list",
      attendance: "/employees/attendance",
    },
  },
} as const;

export type SiteConfig = typeof siteConfig;
