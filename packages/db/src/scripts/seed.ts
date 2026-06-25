import { randomBytes } from 'node:crypto'
import { eq, sql } from 'drizzle-orm'

import { createAuth } from '@gerpain/auth'

import { closeDatabase, db } from '../client'
import {
  bakeries,
  categories,
  employeeLocations,
  employees,
  locations,
  organization as baOrganization,
  member,
  organizations,
  products,
  user,
} from '../schema/index'

const ADMIN_EMAIL = 'admin@gerpain.com'
const ADMIN_PASSWORD = 'admin123'
const ORG_SLUG = 'gerpain'

const auth = createAuth({
  db,
  appName: process.env.VITE_APP_NAME ?? 'Gerpain',
  baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3000',
  secret:
    process.env.BETTER_AUTH_SECRET ??
    'dev-only-change-me-before-production!!',
  disableSignUp: false,
  serverOnly: true,
})

function requestHeaders(): Headers {
  const base = new URL(process.env.BETTER_AUTH_URL ?? 'http://localhost:3000')
  return new Headers({ host: base.host })
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

function newId(): string {
  return randomBytes(16).toString('base64url')
}

async function ensureBaOrganization(adminUserId: string) {
  let baOrg = await db.query.organization.findFirst({
    where: eq(baOrganization.slug, ORG_SLUG),
  })

  if (!baOrg) {
    const [created] = await db
      .insert(baOrganization)
      .values({
        id: newId(),
        name: 'Gerpain Boulangerie',
        slug: ORG_SLUG,
        createdAt: new Date(),
      })
      .returning()
    baOrg = created!

    await db.insert(member).values({
      id: newId(),
      organizationId: baOrg.id,
      userId: adminUserId,
      role: 'owner',
      createdAt: new Date(),
    })
  }

  return baOrg
}

async function seedLegacyDomain(legacyOrgId: string) {
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

async function seed() {
  console.log('🌱 Seeding Gerpain local database…\n')

  const admin = await ensureAuthUser()
  console.log(`👤 Auth user: ${admin.email}`)

  const baOrg = await ensureBaOrganization(admin.id)
  console.log(`🏢 Better Auth org: ${baOrg.name} (${baOrg.slug})`)

  const legacyOrg = await ensureLegacyOrganization(baOrg.id)
  console.log(`🏢 Legacy org: ${legacyOrg.name} (${legacyOrg.id})`)

  const domain = await seedLegacyDomain(legacyOrg.id)

  console.log('\n' + '═'.repeat(50))
  console.log('✅ Seed complete')
  console.log('═'.repeat(50))
  console.log(`  Bakery     : ${domain.bakery.name}`)
  console.log(`  Locations  : ${domain.boutique.name}, ${domain.depot.name}`)
  console.log(`  Categories : ${domain.categories.length}`)
  console.log(`  Products   : ${domain.products.length}`)
  console.log(`  Employees  : ${domain.employees.length}`)
  console.log(`  Login      : ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`)
  console.log('═'.repeat(50))
}

seed()
  .then(async () => {
    await closeDatabase()
    process.exit(0)
  })
  .catch(async (error: unknown) => {
    console.error('Seed failed:', error)
    await closeDatabase()
    process.exit(1)
  })
