import { expect, test, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import AxeBuilder from '@axe-core/playwright'

async function markKana(page: Page) {
  await page.goto('/kana')
  await page.getByRole('button', { name: 'あ a', exact: true }).click()
  const favorite = page.getByRole('button', { name: 'Favorite', exact: true })
  await favorite.click()
  await expect(favorite).toHaveAttribute('aria-pressed', 'true')
}

test('marks survive reload; a downloaded backup can restore and merge across browser profiles', async ({ page, browser }, info) => {
  await markKana(page)
  await page.goto('/kanji/水')
  await page.getByRole('button', { name: 'Learned', exact: true }).click()
  await page.reload()
  await expect(page.getByRole('button', { name: 'Learned', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await page.goto('/progress')
  await expect(page.locator('.saved-list li')).toHaveCount(2)
  const downloaded = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export backup' }).click()
  const download = await downloaded
  const bytes = await readFile((await download.path())!)
  expect(JSON.parse(bytes.toString()).entries).toHaveLength(2)

  const fresh = await browser.newContext({ baseURL: new URL(page.url()).origin, viewport: page.viewportSize()! })
  try {
    const target = await fresh.newPage()
    await target.goto('/kanji/水')
    await target.getByRole('button', { name: 'Favorite', exact: true }).click()
    await target.goto('/progress')
    const upload = () => target.getByLabel('Import backup').setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: bytes })
    await upload()
    await expect(target.getByText('Ready to merge 2 characters.')).toBeVisible()
    await target.getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(target.locator('.saved-list li')).toHaveCount(1)
    for (let repeat = 0; repeat < 2; repeat++) {
      await upload()
      await target.getByRole('button', { name: 'Merge backup' }).click()
      await expect(target.getByText(/Backup merged/)).toBeVisible()
    }
    await expect(target.getByRole('button', { name: 'Favorites (2)' })).toBeVisible()
    await target.getByRole('button', { name: 'Learned (1)' }).click()
    await expect(target.locator('.saved-list li')).toHaveCount(1)
    await expect(target.locator('.saved-list')).toContainText('水')
    await target.getByRole('button', { name: 'All (2)' }).click()
    for (const colorScheme of ['dark', 'light'] as const) {
      await target.emulateMedia({ colorScheme })
      expect((await new AxeBuilder({ page: target }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()).violations).toEqual([])
    }
    expect(await target.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    if (target.viewportSize()?.width === 320) await target.screenshot({ path: info.outputPath('progress-mobile.png'), fullPage: true })
    await target.locator('.saved-list button').click()
    await expect(target.getByRole('dialog')).toBeVisible()
    await target.getByRole('button', { name: 'Favorite', exact: true }).click()
    await target.getByRole('button', { name: 'Close', exact: true }).click()
    await expect(target.locator('.saved-list li')).toHaveCount(1)
  } finally { await fresh.close() }
})

test('invalid backups and interrupted imports preserve previously saved progress', async ({ page }) => {
  await markKana(page)
  await page.goto('/progress')
  const entries = [{ char: 'い', favorite: true, learned: false }, { char: 'う', favorite: false, learned: true }]
  const upload = (data: unknown) => page.getByLabel('Import backup').setInputFiles({ name: 'test.json', mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ format: 'japanese-study-progress', version: 1, entries: data })) })
  await upload([...entries, { char: 'え', learned: 'yes' }])
  await expect(page.getByText(/invalid character record/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Merge backup' })).toHaveCount(0)
  await upload(entries)
  await page.evaluate(() => {
    const put = IDBObjectStore.prototype.put
    IDBObjectStore.prototype.put = function(value, key) {
      const request = put.call(this, value, key)
      if (value.char === 'う') this.transaction.abort()
      return request
    }
  })
  await page.getByRole('button', { name: 'Merge backup' }).click()
  await expect(page.getByText(/Import failed/)).toBeVisible()
  await page.reload()
  await expect(page.locator('.saved-list li')).toHaveCount(1)
  await expect(page.locator('.saved-list')).toContainText('あ')
})

test('concurrent tab edits preserve both flags and update the other tab', async ({ page, context }) => {
  const other = await context.newPage()
  await Promise.all([page.goto('/kanji/水'), other.goto('/kanji/水')])
  await Promise.all([page.getByRole('button', { name: 'Favorite', exact: true }).click(),
    other.getByRole('button', { name: 'Learned', exact: true }).click()])
  await expect(page.getByRole('button', { name: 'Learned', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(other.getByRole('button', { name: 'Favorite', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await other.reload()
  await expect(other.getByRole('button', { name: 'Learned', exact: true })).toHaveAttribute('aria-pressed', 'true')
})

test('storage failure is visible and the character can still be studied', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'indexedDB', { get() { throw new DOMException('Unavailable', 'SecurityError') } })
  })
  await page.goto('/kanji/水')
  await expect(page.getByText(/Local progress is unavailable/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Favorite', exact: true })).toBeDisabled()
  await expect(page.getByText('4 of 4 strokes complete')).toBeVisible()
  await page.goto('/progress')
  await expect(page.getByRole('button', { name: 'Retry storage' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Export backup' })).toHaveCount(0)
})
