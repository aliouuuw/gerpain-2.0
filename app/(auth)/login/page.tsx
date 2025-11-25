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
            "Ce compte a été désactivé. Contactez votre responsable ou l’équipe Gerpain.",
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
    <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-8 shadow-xl">
      {/* Logo and Header */}
      <div className="mb-8 flex flex-col items-center text-center">
        <div className="mb-4 flex size-16 items-center justify-center rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 p-3 shadow-sm">
          <Logo className="size-10 text-amber-600" />
        </div>
        <h1 className="text-2xl font-bold text-stone-900">
          Gerpain ERP
        </h1>
        <p className="mt-2 text-sm text-stone-600">
          Connectez-vous à votre espace de gestion
        </p>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label
            htmlFor="email"
            className="block text-sm font-medium text-stone-700"
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

        <div className="space-y-2">
          <label
            htmlFor="password"
            className="block text-sm font-medium text-stone-700"
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
            className="text-xs font-medium text-amber-700 hover:text-amber-800"
          >
            Mot de passe oublié ?
          </Link>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <Button
          type="submit"
          disabled={pending}
          isLoading={pending}
          loadingText="Connexion en cours"
          className="mt-4 w-full"
        >
          Se connecter
        </Button>
      </form>

      <div className="mt-6 border-t border-stone-200 pt-6">
        <p className="text-center text-xs text-stone-500">
          Système de gestion pour chaînes de boulangeries
        </p>
      </div>
    </div>
  );
}
