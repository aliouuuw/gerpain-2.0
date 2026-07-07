import { closeDatabase } from '../client'
import { ADMIN_EMAIL, ADMIN_PASSWORD, runSeed, shouldTruncateDomain } from './seed-core'

async function main() {
  const target = shouldTruncateDomain() ? 'local' : 'remote'
  console.log(`🌱 Seeding Gerpain ${target} database…\n`)

  const result = await runSeed()

  console.log(`👤 Auth user: ${result.adminEmail}`)
  console.log(`🏢 Better Auth org: ${result.baOrgSlug}`)
  console.log(`🏢 Legacy org: ${result.legacyOrgId}`)

  console.log('\n' + '═'.repeat(50))
  console.log('✅ Seed complete')
  console.log('═'.repeat(50))
  if (result.domainSeeded) {
    console.log('  Domain catalog (re)loaded')
  } else {
    console.log('  Domain catalog unchanged')
  }
  console.log(`  Login      : ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`)
  console.log('═'.repeat(50))
}

main()
  .then(async () => {
    await closeDatabase()
    process.exit(0)
  })
  .catch(async (error: unknown) => {
    console.error('Seed failed:', error)
    await closeDatabase()
    process.exit(1)
  })
