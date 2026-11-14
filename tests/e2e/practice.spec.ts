import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import words from '../../src/features/practice/words.json' with { type: 'json' }
import { readFile } from 'node:fs/promises'

test('word quiz locks feedback, saves its score and survives backup and reload', async ({ page }, info) => {
  await page.goto('/practice')
  await page.getByRole('combobox', { name: 'Deck', exact: true }).selectOption('Kanji vocabulary')
  await page.getByRole('button', { name: 'Start quiz' }).press('Enter')
  for (let i = 0; i < 5; i++) {
    const title = page.locator('#card-title')
    await expect(title).toBeFocused()
    const word = await title.locator('[lang=ja]').innerText()
    const reading = words.find(w => w.text === word)!.readings.at(-1)!
    await page.getByRole('textbox').fill(i === 0 ? 'ああああ' : reading)
    await page.getByRole('textbox').press('Enter')
    await expect(page.getByRole('heading', { name: i === 0 ? 'Review this reading' : 'Correct' })).toBeFocused()
    if (i === 0) {
      for (const colorScheme of ['light', 'dark'] as const) {
        await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' })
        expect((await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze()).violations).toEqual([])
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      }
      if (page.viewportSize()?.width === 320) await page.screenshot({ path: info.outputPath('practice-word-feedback.png'), fullPage: true })
    }
    await page.getByRole('button', { name: i === 4 ? 'See results' : 'Next question' }).press('Enter')
  }
  await expect(page.getByText('4 of 5 correct')).toBeVisible()
  await expect(page.getByText('Saved in this browser.')).toBeVisible()
  await page.getByRole('link', { name: 'View practice history' }).click()
  await page.reload()
  const history = page.getByRole('region', { name: 'Practice history' })
  await expect(history).toContainText('4 of 5 correct')
  const downloaded = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export backup' }).click()
  const buffer = await readFile((await (await downloaded).path())!)
  expect(JSON.parse(buffer.toString()).results[0].count).toBe(4)
  await page.getByLabel('Import backup').setInputFiles({ name: 'practice.json', mimeType: 'application/json', buffer })
  await page.getByRole('button', { name: 'Merge backup' }).click()
  await expect(page.getByText(/Backup merged/)).toBeVisible()
  await expect(history.getByRole('listitem')).toHaveCount(1)
})

test('old marks survive the database upgrade and repeated flashcards do not count as extra cards', async ({ page }) => {
  await page.goto('/speak')
  await page.evaluate(() => new Promise<void>((resolve, reject) => {
    const req = indexedDB.open('japanese-study-progress', 1)
    req.onupgradeneeded = () => {
      req.result.createObjectStore('characters', { keyPath: ['char', 'flag'] }).put({ char: 'か', flag: 'learned' })
    }
    req.onsuccess = () => { req.result.close(); resolve() }
    req.onerror = () => reject(req.error)
  }))
  await page.goto('/practice')
  await page.getByRole('combobox', { name: 'Mode', exact: true }).selectOption('Flashcards')
  await page.getByRole('button', { name: 'Start flashcards' }).click()
  await page.getByRole('button', { name: 'Shuffle remaining' }).click()
  const first = await page.locator('#card-title [lang=ja]').innerText()
  for (let i = 0; i < 6; i++) {
    if (i === 5) await expect(page.locator('#card-title [lang=ja]')).toHaveText(first)
    await page.getByRole('button', { name: 'Reveal reading' }).click()
    await page.getByRole('button', { name: i === 0 ? 'Study again' : 'Set aside' }).click()
  }
  await expect(page.getByText('Saved in this browser.')).toBeVisible()
  await page.goto('/progress')
  await expect(page.getByText('5 cards reviewed · 1 extra review')).toBeVisible()
  await expect(page.locator('.saved-list')).toContainText('か')
})
