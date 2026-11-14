import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test('pages and filters the catalog, opens a result, and restores the list URL', async ({ page }) => {
  const fetched: string[] = []
  page.on('request', r => fetched.push(r.url()))
  await page.goto('/kanji')
  const results = page.locator('.kanji-list a')
  await expect(results).toHaveCount(24)
  expect(fetched.some(url => /\/(details|strokes)\//.test(url))).toBe(false)
  await page.getByRole('button', { name: 'Next', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('25–48')
  await page.getByLabel('Study group').selectOption('1')
  await page.getByLabel('Stroke count').selectOption('4')
  await page.getByLabel('Search kanji').fill('ﾐｽﾞ')
  const link = results.filter({ hasText: '水' }).first()
  await link.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { name: '水', exact: true })).toBeFocused()
  await expect(page.getByText('water', { exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Vocabulary' })).toBeVisible()
  await expect(page.getByText('4 of 4 strokes complete')).toBeVisible()
  await page.goBack()
  await expect(page.getByLabel('Search kanji')).toHaveValue('ﾐｽﾞ')
  await expect(page.getByLabel('Study group')).toHaveValue('1')
  await page.getByLabel('Search kanji').fill('doesnotexistzz')
  await expect(page.getByText('No matching characters.')).toBeVisible()
  await page.getByRole('button', { name: 'Clear filters' }).click()
  await expect(results).toHaveCount(24)
})

test('direct detail loads bounded data, supports stepping and both themes', async ({ page }, info) => {
  const urls: string[] = []
  page.on('request', r => urls.push(r.url()))
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/kanji/水')
  await page.getByRole('button', { name: 'Start over' }).click()
  await page.getByRole('button', { name: 'Next stroke' }).click()
  await expect(page.getByText('1 of 4 strokes complete')).toBeVisible()
  expect(urls.some(u => u.endsWith('/index.json'))).toBe(false)
  for (const theme of ['dark', 'light']) {
    await page.getByLabel('Theme').selectOption(theme)
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()).violations).toEqual([])
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  if (page.viewportSize()?.width === 320) await page.screenshot({ path: info.outputPath('water-mobile.png'), fullPage: true })
  await page.getByRole('link', { name: 'Back to catalog' }).click()
  await expect(page.locator('.kanji-list li')).toHaveCount(24)
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()).violations).toEqual([])
  if (page.viewportSize()?.width === 1440) await page.screenshot({ path: info.outputPath('catalog.png') })
})

test('handles unavailable diagrams, unknown characters, and retryable data failures', async ({ page }) => {
  await page.goto('/kanji/逢')
  await expect(page.getByText(/source diagram has a different stroke count/)).toBeVisible()
  await page.goto('/kanji/𰻞')
  await expect(page.getByText('This character is outside the catalog.')).toBeVisible()
  await page.route('**/index.json', route => route.abort(), { times: 1 })
  await page.goto('/kanji')
  await page.getByRole('button', { name: 'Try again' }).click()
  await expect(page.locator('.kanji-list li')).toHaveCount(24)
})
