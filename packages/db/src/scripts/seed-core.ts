import { eq, sql } from 'drizzle-orm'
import { parseSetCookieHeader } from 'better-auth/cookies'

import { db } from '../client'
import {
  bakeries,
  categories,
  employeeLocations,
  employees,
  locations,
  organization as baOrganization,
  organizations,
  products,
  user,
} from '../schema/index'
import { createSeedAuth } from './seed-auth'

export const ADMIN_EMAIL = 'admin@gerpain.com'
export const ADMIN_PASSWORD = 'admin123'
export const ORG_SLUG = 'gerpain'

const auth = createSeedAuth()

function requestHeaders(): Headers {
  const base = new URL(process.env.BETTER_AUTH_URL ?? 'http://localhost:3000')
  return new Headers({ host: base.host })
}

function authenticatedHeaders(signInHeaders: Headers): Headers {
  const headers = requestHeaders()
  const setCookieParts = signInHeaders.getSetCookie?.() ?? []
  const setCookieHeader =
    setCookieParts.length > 0
      ? setCookieParts.join(', ')
      : (signInHeaders.get('set-cookie') ?? '')
  const sessionToken = parseSetCookieHeader(setCookieHeader).get(
    'better-auth.session_token',
  )?.value

  if (sessionToken) {
    headers.set('cookie', `better-auth.session_token=${sessionToken}`)
  }

  return headers
}

function isLocalDatabase(): boolean {
  const url =
    process.env.DATABASE_URL ??
    'postgresql://gerpain:gerpain@localhost:5432/gerpain_dev'
  return (
    url.includes('localhost') ||
    url.includes('127.0.0.1') ||
    url.includes('@postgres:')
  )
}

export function shouldTruncateDomain(): boolean {
  if (process.env.SEED_TRUNCATE_DOMAIN === 'true') return true
  if (process.env.SEED_TRUNCATE_DOMAIN === 'false') return false
  return isLocalDatabase()
}

async function ensureAuthUser() {
  let admin = await db.query.user.findFirst({
    where: eq(user.email, ADMIN_EMAIL),
  })

  if (!admin) {
    const result = await auth.api.signUpEmail({
      body: {
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        name: 'Admin Gerpain',
      },
      headers: requestHeaders(),
    })

    if (!result.user) {
      throw new Error('signUpEmail did not return a user')
    }

    admin = await db.query.user.findFirst({
      where: eq(user.email, ADMIN_EMAIL),
    })
  }

  if (!admin) {
    throw new Error('Admin user missing after sign-up')
  }

  return admin
}

async function signInAdmin() {
  const signIn = await auth.api.signInEmail({
    body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    headers: requestHeaders(),
    returnHeaders: true,
  })

  if (!signIn.headers) {
    throw new Error('signInEmail did not return session headers')
  }

  return authenticatedHeaders(signIn.headers)
}

async function ensureBaOrganization(sessionHeaders: Headers) {
  let baOrg = await db.query.organization.findFirst({
    where: eq(baOrganization.slug, ORG_SLUG),
  })

  if (!baOrg) {
    const created = await auth.api.createOrganization({
      body: {
        name: 'Gerpain Boulangerie',
        slug: ORG_SLUG,
      },
      headers: sessionHeaders,
    })

    if (!created || !('id' in created) || typeof created.id !== 'string') {
      throw new Error('createOrganization did not return an organization id')
    }

    baOrg = await db.query.organization.findFirst({
      where: eq(baOrganization.id, created.id),
    })
  }

  if (!baOrg) {
    throw new Error('Better Auth organization missing after create')
  }

  await auth.api.setActiveOrganization({
    body: { organizationId: baOrg.id },
    headers: sessionHeaders,
  })

  return baOrg
}

async function seedLegacyDomain(legacyOrgId: string, truncate: boolean) {
  if (truncate) {
    console.log('🧹 Cleaning domain tables…')
    await db.execute(sql`
      TRUNCATE TABLE
        delivery_items,
        delivery_runs,
        cash_collections,
        inventory_items,
        pricing_rules,
        employee_locations,
        employees,
        products,
        categories,
        locations,
        bakeries
      CASCADE
    `)
  } else {
    const existing = await db.query.products.findFirst({
      where: eq(products.organizationId, legacyOrgId),
    })
    if (existing) {
      console.log('ℹ️  Domain data already present — skipping catalog seed.')
      return null
    }
    console.log('ℹ️  Seeding domain catalog (no truncate)…')
  }

  const [bakery] = await db
    .insert(bakeries)
    .values({
      organizationId: legacyOrgId,
      name: 'Boulangerie Centrale',
      code: 'BC',
      address: '12 Avenue Cheikh Anta Diop, Dakar',
      phone: '+221 33 820 00 00',
    })
    .returning()

  const [boutique] = await db
    .insert(locations)
    .values({
      organizationId: legacyOrgId,
      bakeryId: bakery!.id,
      name: 'Boutique Centre-ville',
      type: 'shop',
      address: '45 Rue Carnot, Plateau, Dakar',
      phone: '+221 33 821 11 11',
    })
    .returning()

  const [depot] = await db
    .insert(locations)
    .values({
      organizationId: legacyOrgId,
      bakeryId: bakery!.id,
      name: 'Dépôt Principal',
      type: 'warehouse',
      address: 'Zone Industrielle, Hann, Dakar',
      phone: '+221 33 832 22 22',
    })
    .returning()

  const catData = [
    {
      name: 'Pain',
      description: 'Pains traditionnels',
      color: '#D97706',
      sortOrder: 1,
    },
    {
      name: 'Viennoiserie',
      description: 'Croissants, brioches, etc.',
      color: '#059669',
      sortOrder: 2,
    },
    {
      name: 'Boissons',
      description: 'Jus, eaux, sodas',
      color: '#2563EB',
      sortOrder: 3,
    },
    {
      name: 'Consommables',
      description: 'Snacks et autres',
      color: '#7C3AED',
      sortOrder: 4,
    },
  ]

  const insertedCategories = await db
    .insert(categories)
    .values(catData.map((c) => ({ ...c, organizationId: legacyOrgId })))
    .returning()

  const catMap = Object.fromEntries(
    insertedCategories.map((c) => [c.name, c.id]),
  )

  const prodData = [
    { name: 'Pain Kilo', unitPrice: 1500, categoryId: catMap['Pain']! },
    { name: 'Pain Moyen', unitPrice: 250, categoryId: catMap['Pain']! },
    { name: 'Pain Petit', unitPrice: 150, categoryId: catMap['Pain']! },
    {
      name: 'Croissant',
      unitPrice: 400,
      categoryId: catMap['Viennoiserie']!,
    },
    {
      name: 'Pain au chocolat',
      unitPrice: 450,
      categoryId: catMap['Viennoiserie']!,
    },
    {
      name: 'Brioche',
      unitPrice: 350,
      categoryId: catMap['Viennoiserie']!,
    },
    { name: "Jus d'orange", unitPrice: 800, categoryId: catMap['Boissons']! },
    {
      name: 'Eau minérale',
      unitPrice: 300,
      categoryId: catMap['Boissons']!,
    },
    { name: 'Fataya', unitPrice: 250, categoryId: catMap['Consommables']! },
  ]

  const insertedProducts = await db
    .insert(products)
    .values(prodData.map((p) => ({ ...p, organizationId: legacyOrgId })))
    .returning()

  const empData = [
    {
      firstName: 'Ali',
      lastName: 'Konaté',
      role: 'delivery' as const,
      phone: '+221 77 100 00 01',
    },
    {
      firstName: 'Amina',
      lastName: 'Diallo',
      role: 'delivery' as const,
      phone: '+221 77 100 00 02',
    },
    {
      firstName: 'Moussa',
      lastName: 'Traoré',
      role: 'delivery' as const,
      phone: '+221 77 100 00 03',
    },
    {
      firstName: 'Marie',
      lastName: 'Camara',
      role: 'cashier' as const,
      phone: '+221 77 100 00 04',
    },
    {
      firstName: 'Aminata',
      lastName: 'Ba',
      role: 'manager' as const,
      phone: '+221 77 100 00 05',
    },
  ]

  const insertedEmployees = await db
    .insert(employees)
    .values(
      empData.map((e) => ({
        ...e,
        organizationId: legacyOrgId,
        bakeryId: bakery!.id,
        status: 'active' as const,
        commissionRate: 0,
        hireDate: '2025-01-01',
      })),
    )
    .returning()

  await db.insert(employeeLocations).values(
    insertedEmployees.map((emp) => ({
      employeeId: emp.id,
      locationId: boutique!.id,
      isPrimary: true,
    })),
  )

  return {
    bakery: bakery!,
    boutique: boutique!,
    depot: depot!,
    categories: insertedCategories,
    products: insertedProducts,
    employees: insertedEmployees,
  }
}

async function ensureLegacyOrganization(baOrgId: string) {
  let legacyOrg = await db.query.organizations.findFirst({
    where: eq(organizations.slug, ORG_SLUG),
  })

  if (!legacyOrg) {
    const [created] = await db
      .insert(organizations)
      .values({
        name: 'Gerpain Boulangerie',
        slug: ORG_SLUG,
        description: 'Chaîne de boulangeries — Dakar, Sénégal',
        settings: JSON.stringify({ betterAuthOrganizationId: baOrgId }),
      })
      .returning()
    legacyOrg = created!
  } else {
    await db
      .update(organizations)
      .set({
        settings: JSON.stringify({ betterAuthOrganizationId: baOrgId }),
      })
      .where(eq(organizations.id, legacyOrg.id))
  }

  return legacyOrg
}

export type SeedResult = {
  adminEmail: string
  baOrgSlug: string
  legacyOrgId: string
  domainSeeded: boolean
}

export async function runSeed(): Promise<SeedResult> {
  const truncate = shouldTruncateDomain()

  const admin = await ensureAuthUser()
  const sessionHeaders = await signInAdmin()
  const baOrg = await ensureBaOrganization(sessionHeaders)
  const legacyOrg = await ensureLegacyOrganization(baOrg.id)
  const domain = await seedLegacyDomain(legacyOrg.id, truncate)

  return {
    adminEmail: admin.email,
    baOrgSlug: baOrg.slug,
    legacyOrgId: legacyOrg.id,
    domainSeeded: domain !== null,
  }
}
