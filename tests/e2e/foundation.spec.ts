import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const destinations = ['Kana', 'Kanji', 'Practice', 'Speak', 'Progress']

test('all sections support direct entry, active navigation, and the viewport', async ({ page }) => {
  for (const title of destinations) {
    await page.goto('/' + title.toLowerCase())
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: title, exact: true })).toHaveAttribute('aria-current', 'page')
    await expect(page).toHaveTitle(title + ' | Kotoba Study')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  }
  await page.goto('/kanji/example')
  await expect(page.getByRole('heading', { name: 'Kanji details' })).toBeVisible()
})

test('keyboard navigation moves focus into the new page and supports Back', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/kana$/)
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('main')).toBeFocused()
  await page.getByRole('link', { name: 'Practice', exact: true }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { name: 'Practice' })).toBeFocused()
  await page.goBack()
  await expect(page.getByRole('heading', { name: 'Kana', level: 1, exact: true })).toBeFocused()
})

test('system follows the device and explicit themes survive reload', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' })
  await page.goto('/kana')
  const background = () => page.locator('body').evaluate(el => getComputedStyle(el).backgroundColor)
  const theme = page.getByRole('combobox', { name: 'Theme' })
  const dark = await background()
  await page.emulateMedia({ colorScheme: 'light' })
  const light = await background()
  expect(light).not.toBe(dark)
  await theme.selectOption('dark')
  await page.reload()
  await expect(theme).toHaveValue('dark')
  expect(await background()).toBe(dark)
  await theme.selectOption('light')
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.reload()
  await expect(theme).toHaveValue('light')
  expect(await background()).toBe(light)
  await theme.selectOption('system')
  await page.reload()
  await expect(theme).toHaveValue('system')
  expect(await background()).toBe(dark)
})

test('both page layouts pass automated WCAG A and AA checks in both themes', async ({ page }, testInfo) => {
  for (const path of ['/kana', '/progress']) {
    await page.goto(path)
    for (const theme of ['light', 'dark']) {
      await page.getByRole('combobox').selectOption(theme)
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze()
      expect(results.violations).toEqual([])
      const width = page.viewportSize()?.width
      if (path === '/kana' && (width === 320 || width === 1440)) {
        await page.screenshot({ path: testInfo.outputPath('kana-' + theme + '.png'), fullPage: true })
      }
    }
  }
})
