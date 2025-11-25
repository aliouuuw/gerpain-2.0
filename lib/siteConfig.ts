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
      locations: "/sales/locations",
      reports: "/sales/reports",
      customers: "/sales/customers",
    },
    team: {
      staff: "/team/staff",
      schedules: "/team/schedules",
      payroll: "/team/payroll",
    },
  },
}

export type siteConfig = typeof siteConfig
