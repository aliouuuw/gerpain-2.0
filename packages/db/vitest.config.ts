import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // These are integration tests that share a single Postgres database and
    // each (re)seed it in beforeAll. Running files in parallel races the seed
    // (and now trips the bakeries(org, code) unique constraint), so force them
    // to run one file at a time.
    fileParallelism: false,
  },
})
