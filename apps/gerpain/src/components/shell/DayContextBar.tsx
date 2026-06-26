import { bakery, getDayStats, todayLabel } from '#/mock/operational'

export function DayContextBar() {
  const stats = getDayStats()
  const alerts: string[] = []

  if (stats.toValidateDelivery > 0) {
    alerts.push(`${stats.toValidateDelivery} livraison à valider`)
  }
  if (stats.drafts > 0) {
    alerts.push(`${stats.drafts} brouillon`)
  }
  if (stats.toValidateCollection > 0) {
    alerts.push(`${stats.toValidateCollection} encaissement à valider`)
  }

  return (
    <div className="day-context">
      <div className="day-context__left">
        <button type="button" className="bakery-btn" aria-haspopup="listbox">
          <span className="bakery-btn__code">{bakery.code}</span>
          <span className="bakery-btn__name">{bakery.name}</span>
          <span className="bakery-btn__chev" aria-hidden="true">
            ▾
          </span>
        </button>
        <div className="day-context__date">
          <span className="day-context__date-label">Journée du</span>
          <time className="day-context__date-value">{todayLabel()}</time>
        </div>
      </div>
      <div className="day-context__right">
        {alerts.length > 0 ? (
          <p className="day-context__alerts" role="status">
            <span className="day-context__alerts-dot" aria-hidden="true" />
            {alerts.join(' · ')}
          </p>
        ) : (
          <p className="day-context__ok">Tout est à jour pour aujourd&apos;hui</p>
        )}
      </div>
    </div>
  )
}
