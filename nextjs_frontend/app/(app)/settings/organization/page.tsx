"use client";

import { useState, useEffect } from "react";
import { Building2, Save, Loader2 } from "lucide-react";

import { Button } from "@/components/Button";
import { Card, CardContent, CardHeader } from "@/components/Card";
import { useToast } from "@/components/ui/toast";
import { useOrganizations, useUpdateOrganization } from "@/lib/hooks/useOrganization";
import { useSession } from "@/lib/auth-client";

export default function OrganizationSettingsPage() {
  const { notify } = useToast();
  const { data: session } = useSession();
  const { data: organizations = [], isLoading } = useOrganizations();
  const updateOrganization = useUpdateOrganization();

  const currentOrg = organizations[0];

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    address: "",
    currency: "XOF",
  });

  useEffect(() => {
    if (currentOrg) {
      setFormData({
        name: currentOrg.name || "",
        description: currentOrg.description || "",
        address: currentOrg.settings?.address || "",
        currency: currentOrg.settings?.currency || "XOF",
      });
    }
  }, [currentOrg]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentOrg) {
      notify({
        variant: "error",
        title: "Erreur",
        description: "Aucune organisation trouvée.",
      });
      return;
    }

    if (!formData.name.trim()) {
      notify({
        variant: "error",
        title: "Erreur",
        description: "Le nom de l'organisation est requis.",
      });
      return;
    }

    try {
      await updateOrganization.mutateAsync({
        id: currentOrg.id,
        data: {
          name: formData.name,
          description: formData.description || undefined,
          settings: {
            ...currentOrg.settings,
            address: formData.address,
            currency: formData.currency,
          },
        },
      });
    } catch (error) {
      console.error("Failed to update organization:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-8 animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  if (!currentOrg) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">
            Paramètres de l&apos;organisation
          </h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Aucune organisation trouvée
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">
          Paramètres de l&apos;organisation
        </h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Gérez les informations de votre boulangerie
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-xl bg-[var(--primary-subtle)] text-[var(--primary)]">
                <Building2 className="size-6" />
              </div>
              <div>
                <h2 className="text-lg font-medium text-[var(--foreground)]">
                  Profil de l&apos;organisation
                </h2>
                <p className="text-sm text-[var(--muted-foreground)]">
                  Informations générales de votre entreprise
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)]">
                  Nom de l&apos;organisation *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  className="mt-1.5 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                  placeholder="Ma Boulangerie"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--foreground)]">
                  Identifiant (slug)
                </label>
                <input
                  type="text"
                  value={currentOrg.slug}
                  disabled
                  className="mt-1.5 w-full rounded-lg border border-[var(--border)] bg-[var(--secondary)] px-3 py-2 text-sm text-[var(--muted-foreground)] cursor-not-allowed"
                />
                <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                  L&apos;identifiant ne peut pas être modifié après création
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--foreground)]">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="mt-1.5 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 resize-none"
                placeholder="Description de votre boulangerie..."
              />
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)]">
                  Adresse
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
                  className="mt-1.5 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                  placeholder="123 Rue de la Boulangerie, Dakar"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--foreground)]">
                  Devise
                </label>
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData((prev) => ({ ...prev, currency: e.target.value }))}
                  className="mt-1.5 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                >
                  <option value="XOF">XOF (Franc CFA)</option>
                  <option value="EUR">EUR (Euro)</option>
                  <option value="USD">USD (Dollar US)</option>
                </select>
              </div>
            </div>

            <div className="border-t border-[var(--border)] pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[var(--foreground)]">
                    Informations du compte
                  </p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    Créé le {new Date(currentOrg.createdAt).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <Button type="submit" disabled={updateOrganization.isPending}>
                  {updateOrganization.isPending ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Enregistrement...
                    </>
                  ) : (
                    <>
                      <Save className="size-4" />
                      Enregistrer
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
