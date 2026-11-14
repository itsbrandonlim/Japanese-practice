import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { StudyRoutes } from './router'
import { themeKey } from './theme'

function open(path: string) {
  return render(<MemoryRouter initialEntries={[path]}><StudyRoutes /></MemoryRouter>)
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  localStorage.clear()
})

it('opens Kana at the root and marks the current destination', () => {
  open('/')
  expect(screen.getByRole('heading', { name: 'Kana' })).toBeTruthy()
  expect(screen.getByRole('link', { name: 'Kana' }).getAttribute('aria-current')).toBe('page')
})

it('restores the saved theme and writes subsequent choices', () => {
  localStorage.setItem(themeKey, 'dark')
  open('/practice')
  const select = screen.getByRole<HTMLSelectElement>('combobox', { name: 'Theme' })
  expect(select.value).toBe('dark')
  fireEvent.change(select, { target: { value: 'light' } })
  expect(document.documentElement.dataset.theme).toBe('light')
  expect(localStorage.getItem(themeKey)).toBe('light')
})

it('falls back to system for unknown stored values', () => {
  localStorage.setItem(themeKey, 'invalid')
  open('/kana')
  expect(document.documentElement.dataset.theme).toBe('system')
})

it('keeps navigation and theme selection usable when storage is blocked', () => {
  const deny = () => { throw new DOMException('Storage disabled', 'SecurityError') }
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(deny)
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(deny)
  open('/speak')
  expect(screen.getByRole('heading', { name: 'Speak' })).toBeTruthy()
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'dark' } })
  expect(document.documentElement.dataset.theme).toBe('dark')
})

it('offers a route back from an unknown address', () => {
  open('/missing')
  expect(screen.getByRole('heading', { name: 'Page not found' })).toBeTruthy()
  expect(screen.getByRole('link', { name: 'Browse Kana' }).getAttribute('href')).toBe('/kana')
})
