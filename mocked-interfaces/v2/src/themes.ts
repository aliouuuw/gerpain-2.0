export interface Theme {
  id: string;
  label: string;
  className: string;
}

export const themes: Theme[] = [
  { id: 'gerpain-legacy', label: 'Gerpain legacy', className: 'theme-gerpain-legacy' },
  { id: 'warm-precision', label: 'Warm precision', className: 'theme-warm-precision' },
  { id: 'clinical-sharp', label: 'Clinical sharp', className: 'theme-clinical-sharp' },
  { id: 'caisse-senegalaise', label: 'Caisse sénégalaise', className: 'theme-caisse-senegalaise' },
  { id: 'lumen-neo', label: 'Lumen neo', className: 'theme-lumen-neo' },
  { id: 'lumiere-matinale', label: 'Lumière matinale', className: 'theme-lumiere-matinale' },
];

export const defaultTheme = themes[0];

export const THEME_STORAGE_KEY = 'gerpain-mock-v2-theme';

export function getStoredTheme(): Theme {
  const stored = typeof window !== 'undefined' ? localStorage.getItem(THEME_STORAGE_KEY) : null;
  return themes.find((t) => t.id === stored) || defaultTheme;
}

export function setStoredTheme(theme: Theme) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(THEME_STORAGE_KEY, theme.id);
  }
}
