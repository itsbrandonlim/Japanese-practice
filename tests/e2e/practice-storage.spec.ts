import { expect, test } from '@playwright/test'

test('a kana quiz keeps its summary when saving fails and can retry once storage recovers', async ({ page }) => {
  await page.goto('/practice')
  await page.getByRole('button', { name: 'Start quiz' }).click()
  for (let i = 0; i < 5; i++) {
    await expect(page.locator('.answer-choices button')).toHaveCount(4)
    await page.locator('.answer-choices button').first().click()
    if (i === 4) await page.evaluate(() => {
      const open = IDBFactory.prototype.open
      IDBFactory.prototype.open = function () {
        IDBFactory.prototype.open = open
        throw new DOMException('Unavailable', 'SecurityError')
      }
    })
    await page.getByRole('button', { name: i === 4 ? 'See results' : 'Next question' }).click()
  }
  await expect(page.getByText(/Could not save this result/)).toBeVisible()
  await page.getByRole('button', { name: 'Retry saving' }).click()
  await expect(page.getByText('Saved in this browser.')).toBeVisible()
  await page.goto('/progress')
  await expect(page.locator('.practice-history li')).toHaveCount(1)
})

test('restoring different backups keeps the newest 100 sessions without replacing existing outcomes', async ({ page }) => {
  await page.goto('/progress')
  const rows = Array.from({ length: 101 }, (_, i) => ({
    id: '00000000-0000-4000-8000-' + String(i).padStart(12, '0'),
    finished: new Date(1700000000000 + i * 1000).toISOString(),
    mode: 'Quiz', deck: 'Katakana', total: 5, count: 2,
  }))
  for (const results of [rows.slice(0, 100), [{ ...rows[99], count: 1 }, { ...rows[100], count: 4 }]]) {
    await page.getByLabel('Import backup').setInputFiles({ name: 'results.json', mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify({ format: 'japanese-study-progress', version: 2, entries: [], results })) })
    await page.getByRole('button', { name: 'Merge backup' }).click()
    await expect(page.getByText(/Backup merged/)).toBeVisible()
  }
  await page.reload()
  const list = page.locator('.practice-history li')
  await expect(list).toHaveCount(100)
  await expect(list.first()).toContainText('4 of 5 correct')
  await expect(list.nth(1)).toContainText('2 of 5 correct')
  await expect(list.last().locator('time')).toHaveAttribute('datetime', rows[1].finished)
})
