"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthError, signInWithEmail } from "@/lib/auth-client";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { Logo } from "@/components/Logo";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      await signInWithEmail(email, password);
      router.replace("/dashboard");
    } catch (err) {
      if (err instanceof AuthError) {
        if (err.code === "INVALID_CREDENTIALS") {
          setError(
            "Adresse e-mail ou mot de passe incorrect. Vérifiez vos identifiants.",
          );
        } else if (err.code === "ACCOUNT_DISABLED") {
          setError(
            "Ce compte a été désactivé. Contactez votre responsable ou l'équipe Gerpain.",
          );
        } else if (err.code === "NETWORK_ERROR") {
          setError(
            "Impossible de se connecter au serveur. Vérifiez votre connexion et réessayez.",
          );
        } else {
          setError(
            "Un problème technique empêche la connexion. Réessayez dans quelques instants.",
          );
        }
      } else {
        setError(
          "Un problème technique empêche la connexion. Réessayez dans quelques instants.",
        );
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="w-full rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[var(--card)] p-8 shadow-[var(--shadow-lg)]">
      {/* Logo and Header */}
      <div className="mb-8 flex flex-col items-center text-center">
        <div className="mb-5 flex size-14 items-center justify-center rounded-xl bg-[var(--primary)] shadow-[var(--shadow-md)]">
          <Logo className="size-7 text-[var(--primary-foreground)]" />
        </div>
        <h1 className="font-display text-2xl font-normal text-[var(--foreground)]">
          Gerpain
        </h1>
        <p className="mt-1.5 text-sm text-[var(--muted-foreground)]">
          Connectez-vous à votre espace de gestion
        </p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-1.5">
          <label
            htmlFor="email"
            className="block text-sm font-medium text-[var(--foreground)]"
          >
            Adresse e-mail
          </label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="vous@exemple.com"
            hasError={!!error}
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="password"
            className="block text-sm font-medium text-[var(--foreground)]"
          >
            Mot de passe
          </label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            hasError={!!error}
          />
        </div>

        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="text-xs font-medium text-[var(--primary)] transition-colors hover:text-[var(--primary-hover)]"
          >
            Mot de passe oublié ?
          </Link>
        </div>

        {error && (
          <div className="rounded-[var(--radius-md)] bg-[var(--error-subtle)] p-3 text-sm text-[var(--error)]">
            {error}
          </div>
        )}

        <Button
          type="submit"
          disabled={pending}
          isLoading={pending}
          loadingText="Connexion…"
          className="mt-2 w-full"
        >
          Se connecter
        </Button>
      </form>

      <div className="mt-8 border-t border-[var(--border-subtle)] pt-6">
        <p className="text-center text-xs text-[var(--muted-foreground)]">
          Système de gestion pour chaînes de boulangeries
        </p>
      </div>
    </div>
  );
}
