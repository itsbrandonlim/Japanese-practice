import { useEffect, useState } from 'react'
import { readTheme, themeKey, themes, type Theme } from '../app/theme'

export function ThemeControl() {
  const [theme, setTheme] = useState(readTheme)
  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])
  useEffect(() => {
    function sync(event: StorageEvent) {
      if (event.key === themeKey || event.key === null) setTheme(readTheme())
    }
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [])

  function selectTheme(value: Theme) {
    setTheme(value)
    try {
      localStorage.setItem(themeKey, value)
    } catch {
      // Keep the selected theme for this session when saving is unavailable.
    }
  }

  return (
    <label className="theme-control">
      <span>Theme</span>
      <select value={theme} onChange={event => selectTheme(event.target.value as Theme)}>
        {themes.map(value => <option key={value} value={value}>{value[0].toUpperCase() + value.slice(1)}</option>)}
      </select>
    </label>
  )
}
