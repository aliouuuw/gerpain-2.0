"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { Logo } from "@/components/Logo";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [pending, setPending] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);

    try {
      // UI-only for now: simulate a short request
      await new Promise((resolve) => setTimeout(resolve, 800));
      setSubmitted(true);
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-8 shadow-xl">
      <div className="mb-8 flex flex-col items-center text-center">
        <div className="mb-4 flex size-16 items-center justify-center rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 p-3 shadow-sm">
          <Logo className="size-10 text-amber-600" />
        </div>
        <h1 className="text-2xl font-bold text-stone-900">
          Réinitialiser votre mot de passe
        </h1>
        <p className="mt-2 text-sm text-stone-600">
          Entrez l’adresse e-mail associée à votre compte. Pour l’instant, cette
          fonctionnalité est en cours de déploiement pour les chaînes pilotes.
        </p>
      </div>

      {submitted ? (
        <div className="space-y-6">
          <div className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800">
            <p className="font-medium">Demande enregistrée</p>
            <p className="mt-1 text-xs text-emerald-900/80">
              Si cette fonctionnalité est activée pour votre chaîne, vous serez
              contacté par votre responsable ou par l’équipe Gerpain pour
              réinitialiser votre accès.
            </p>
          </div>

          <Button asChild className="w-full">
            <Link href="/login">Retour à la connexion</Link>
          </Button>
        </div>
      ) : (
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
            />
          </div>

          <Button
            type="submit"
            disabled={pending}
            isLoading={pending}
            loadingText="Envoi en cours"
            className="mt-2 w-full"
          >
            Envoyer la demande
          </Button>

          <p className="text-center text-xs text-stone-500">
            Vous pouvez également contacter directement votre responsable pour
            débloquer ou réinitialiser votre accès.
          </p>
        </form>
      )}

      <div className="mt-6 border-t border-stone-200 pt-6">
        <p className="text-center text-xs text-stone-500">
          Système de gestion pour chaînes de boulangeries
        </p>
      </div>
    </div>
  );
}
