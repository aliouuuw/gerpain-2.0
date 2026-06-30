import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // These are integration tests that share a single Postgres database and
    // each (re)seed it in beforeAll. Running files in parallel races the seed
    // (and now trips the bakeries(org, code) unique constraint), so force them
    // to run one file at a time.
    fileParallelism: false,
    env: {
      // Never TRUNCATE the developer's local DB when running tests — seed is
      // idempotent without truncate (see seed-core bakery guard).
      SEED_TRUNCATE_DOMAIN: 'false',
    },
  },
})
