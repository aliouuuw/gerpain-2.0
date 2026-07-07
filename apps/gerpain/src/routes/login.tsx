import { createFileRoute, redirect } from '@tanstack/react-router'
import { Lock, Mail } from 'lucide-react'
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

      window.location.assign('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Échec de la connexion')
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <aside className="login-visual">
        <img
          className="login-visual__img"
          src="/login-hero.jpg"
          alt=""
          width={1200}
          height={1600}
          decoding="async"
        />
        <div className="login-visual__shade" />
        <div className="login-visual__caption">
          <p className="login-visual__logo">Gerpain</p>
          <p className="login-visual__tagline">Distribution boulangerie</p>
        </div>
      </aside>

      <main className="login-panel">
        <div className="login-panel__inner">
          <header className="login-panel__header">
            <p className="login-panel__logo">Gerpain</p>
            <p className="login-panel__tagline">Distribution boulangerie</p>
          </header>

          <div className="login-card">
            <div className="login-card__head">
              <h1 className="login-card__title">Connexion</h1>
              <p className="login-card__subtitle">
                Accès sur invitation. Contactez votre administrateur si vous
                n&apos;avez pas de compte.
              </p>
            </div>

            <form
              className="login-form"
              onSubmit={(e) => void handleSubmit(e)}
            >
              <div className="login-field">
                <label className="login-field__label" htmlFor="email">
                  E-mail
                </label>
                <div className="login-field__control">
                  <Mail
                    className="login-field__icon"
                    size={18}
                    strokeWidth={1.75}
                    aria-hidden="true"
                  />
                  <input
                    id="email"
                    className="login-field__input"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    autoFocus
                    placeholder="vous@boulangerie.com"
                  />
                </div>
              </div>

              <div className="login-field">
                <label className="login-field__label" htmlFor="password">
                  Mot de passe
                </label>
                <div className="login-field__control">
                  <Lock
                    className="login-field__icon"
                    size={18}
                    strokeWidth={1.75}
                    aria-hidden="true"
                  />
                  <input
                    id="password"
                    className="login-field__input"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    autoComplete="current-password"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              {error ? (
                <p className="login-form__error" role="alert">
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                className="login-form__submit"
                disabled={loading}
              >
                {loading ? 'Connexion…' : 'Se connecter'}
              </button>
            </form>
          </div>

          {import.meta.env.DEV ? (
            <p className="login-panel__demo">
              Démo : <code>admin@gerpain.com</code> / <code>admin123</code>
              {' '}
              après <code>bun run db:seed</code>
            </p>
          ) : null}
        </div>
      </main>
    </div>
  )
}
