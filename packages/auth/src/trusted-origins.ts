/** Extra origins beyond `baseURL` (Better Auth adds baseURL automatically). */
export function additionalTrustedOrigins(
  baseURL: string,
  extra: string[] = [],
): string[] {
  const origins = new Set<string>()
  const url = new URL(baseURL)
  const host = url.hostname

  if (host.startsWith('www.')) {
    origins.add(`${url.protocol}//${host.slice(4)}`)
  } else if (host !== 'localhost' && host !== '127.0.0.1') {
    origins.add(`${url.protocol}//www.${host}`)
  }

  if (process.env.NODE_ENV !== 'production') {
    origins.add('http://localhost:3000')
    origins.add('http://127.0.0.1:3000')
  }

  if (process.env.VERCEL_URL) {
    origins.add(`https://${process.env.VERCEL_URL}`)
  }

  origins.add('https://*.vercel.app')

  for (const origin of extra) {
    origins.add(origin)
  }

  const envOrigins = process.env.BETTER_AUTH_TRUSTED_ORIGINS
  if (envOrigins) {
    for (const origin of envOrigins.split(',')) {
      const trimmed = origin.trim()
      if (trimmed) origins.add(trimmed)
    }
  }

  origins.delete(url.origin)

  return [...origins]
}
