const BAKERY_STORAGE_KEY = 'selectedBakeryId'

export function getStoredBakeryId(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(BAKERY_STORAGE_KEY)
}

export function setStoredBakeryId(bakeryId: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(BAKERY_STORAGE_KEY, bakeryId)
}
