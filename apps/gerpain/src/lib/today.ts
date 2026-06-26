export function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

export function todayLabel(): string {
  return new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}
