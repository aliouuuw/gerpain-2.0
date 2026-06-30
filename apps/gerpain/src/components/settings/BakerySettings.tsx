import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

import { Card } from '#/components/ui/Card'
import { useBakery } from '#/lib/bakery-context'
import {
  payrollPresetLabels,
  type BakerySettings,
} from '#/lib/bakery-settings'
import { orpc } from '#/lib/orpc-client'
import { usePermissions } from '#/lib/use-permissions'

type FormState = {
  name: string
  address: string
  phone: string
  defaultPayrollPreset: BakerySettings['defaultPayrollPreset'] | ''
}

export function BakerySettings() {
  const { bakeryId, bakery, isLoading, setBakeryId } = useBakery()
  const { canManageCollections: canManage } = usePermissions()
  const queryClient = useQueryClient()

  const detail = useQuery({
    ...orpc.bakeries.get.queryOptions({ input: { bakeryId } }),
    enabled: Boolean(bakeryId),
  })

  const [form, setForm] = useState<FormState>({
    name: '',
    address: '',
    phone: '',
    defaultPayrollPreset: '',
  })
  const [formError, setFormError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!detail.data) return
    setForm({
      name: detail.data.name,
      address: detail.data.address ?? '',
      phone: detail.data.phone ?? '',
      defaultPayrollPreset: detail.data.settings.defaultPayrollPreset ?? '',
    })
  }, [detail.data])

  const updateMutation = useMutation(
    orpc.bakeries.update.mutationOptions({
      onSuccess: async (updated) => {
        setFormError(null)
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
        await queryClient.invalidateQueries({
          queryKey: orpc.bakeries.list.key(),
        })
        await queryClient.invalidateQueries({
          queryKey: orpc.bakeries.get.key({ input: { bakeryId: updated.id } }),
        })
        setBakeryId(updated.id)
      },
      onError: (error) => setFormError(error.message),
    }),
  )

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!bakeryId || !canManage) return

    updateMutation.mutate({
      bakeryId,
      name: form.name.trim(),
      address: form.address.trim() || null,
      phone: form.phone.trim() || null,
      settings: {
        defaultPayrollPreset: form.defaultPayrollPreset || undefined,
      },
    })
  }

  return (
    <Card title="Boulangerie active" className="settings-section">
      {isLoading || detail.isLoading ? (
        <p className="settings-form__hint">Chargement…</p>
      ) : !bakery || !detail.data ? (
        <p className="settings-form__hint">Aucune boulangerie sélectionnée.</p>
      ) : !canManage ? (
        <dl className="settings-dl">
          <div className="settings-dl__row">
            <dt>Nom</dt>
            <dd>{bakery.name}</dd>
          </div>
          <div className="settings-dl__row">
            <dt>Code</dt>
            <dd>{bakery.code}</dd>
          </div>
          <div className="settings-dl__row">
            <dt>Adresse</dt>
            <dd>{bakery.address ?? '—'}</dd>
          </div>
          <div className="settings-dl__row">
            <dt>Téléphone</dt>
            <dd>{bakery.phone ?? '—'}</dd>
          </div>
        </dl>
      ) : (
        <form className="settings-form settings-form--flush" onSubmit={(e) => void handleSubmit(e)}>
          <p className="settings-form__hint">
            Informations affichées dans l&apos;application et préférences
            opérationnelles pour cette boulangerie.
          </p>
          <div className="settings-form__grid">
            <label className="settings-form__field">
              <span>Nom</span>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
                maxLength={255}
              />
            </label>
            <label className="settings-form__field">
              <span>Code</span>
              <input value={bakery.code} disabled readOnly aria-readonly />
            </label>
            <label className="settings-form__field settings-form__field--wide">
              <span>Adresse</span>
              <input
                value={form.address}
                onChange={(e) =>
                  setForm((f) => ({ ...f, address: e.target.value }))
                }
                maxLength={500}
              />
            </label>
            <label className="settings-form__field">
              <span>Téléphone</span>
              <input
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                maxLength={50}
              />
            </label>
            <label className="settings-form__field">
              <span>Période paie par défaut</span>
              <select
                value={form.defaultPayrollPreset}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    defaultPayrollPreset: e.target.value as FormState['defaultPayrollPreset'],
                  }))
                }
              >
                <option value="">— Calendrier mois —</option>
                {(Object.keys(payrollPresetLabels) as Array<
                  keyof typeof payrollPresetLabels
                >).map((key) => (
                  <option key={key} value={key}>
                    {payrollPresetLabels[key]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {formError ? (
            <p className="settings-form__error">{formError}</p>
          ) : null}
          {saved ? (
            <p className="settings-form__hint" role="status">
              Enregistré.
            </p>
          ) : null}
          <div className="settings-form__actions">
            <button
              type="submit"
              className="btn-primary btn-sm"
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </form>
      )}
    </Card>
  )
}
