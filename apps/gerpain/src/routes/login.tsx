import { createFileRoute, redirect } from '@tanstack/react-router'
import { useState } from 'react'

import { authClient } from '#/lib/auth-client'
import { getOptionalSession } from '#/server/require-session-fn'

export const Route = createFileRoute('/login')({
  beforeLoad: async () => {
    const session = await getOptionalSession()
    if (session) {
      throw redirect({ to: '/' })
    }
  },
  component: LoginPage,
})

function LoginPage() {
  const navigate = Route.useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const result = await authClient.signIn.email({ email, password })
      if (result.error) throw new Error(result.error.message)

      const orgs = await authClient.organization.list()
      const firstOrg = orgs.data?.[0]
      if (firstOrg) {
        await authClient.organization.setActive({
          organizationId: firstOrg.id,
        })
      }

      await navigate({ to: '/' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Échec de la connexion')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-[70dvh] max-w-md flex-col justify-center p-8">
      <p className="text-sm font-medium uppercase tracking-widest text-neutral-500">
        Accès opérateur
      </p>
      <h1 className="mt-2 text-3xl font-bold text-neutral-900">
        Connexion Gerpain
      </h1>
      <p className="mt-2 text-sm text-neutral-600">
        Inscription publique désactivée. Contactez votre administrateur.
      </p>

      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="mt-8 space-y-5 rounded-lg border border-neutral-200 bg-white p-6 shadow-sm"
      >
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium text-neutral-700">
            E-mail
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-2">
          <label
            htmlFor="password"
            className="text-sm font-medium text-neutral-700"
          >
            Mot de passe
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="current-password"
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </div>
        {error ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {loading ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-neutral-400">
        Compte démo : admin@gerpain.com / admin123 (après{' '}
        <code className="rounded bg-neutral-100 px-1">bun run db:seed</code>)
      </p>
    </div>
  )
}
