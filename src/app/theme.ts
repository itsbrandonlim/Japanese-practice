export const themes = ['system', 'light', 'dark'] as const
export type Theme = typeof themes[number]
export const themeKey = 'japanese-study.theme'

export function readTheme(): Theme {
  try {
    const value = localStorage.getItem(themeKey)
    if (value === 'light' || value === 'dark') return value
  } catch {
    // Storage can be unavailable in restricted browsing contexts.
  }
  return 'system'
}
