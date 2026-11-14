import { expect, test } from '@playwright/test'

test('cold entry, catalog search and a bookmarked character load the expected resources', async ({ page, browser }, info) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  const files = () => page.evaluate(() => performance.getEntriesByType('resource')
    .map(entry => ({ path: new URL(entry.name).pathname, bytes: (entry as PerformanceResourceTiming).decodedBodySize })))
  await page.goto('/')
  await page.getByRole('button', { name: 'あ a', exact: true }).waitFor()
  const initial = await files()
  expect(initial.some(r => /\/data\/kanji\/|\/assets\/(Hiragana|Katakana)-/.test(r.path))).toBe(false)
  await page.getByRole('link', { name: 'Kanji', exact: true }).click()
  const cards = page.locator('.kanji-list a')
  await expect(cards).toHaveCount(24)
  const responseMs: number[] = []
  for (const q of ['water', 'ひと', 'tree', 'みず', '水']) {
    const duration = await page.evaluate(async term => {
      const input = document.querySelector<HTMLInputElement>('input[type=search]')!
      const start = performance.now()
      const rerendered = new Promise<void>(resolve => {
        const observer = new MutationObserver(() => {
          observer.disconnect()
          requestAnimationFrame(() => resolve())
        })
        observer.observe(document.querySelector('.kanji-list')!, { childList: true, subtree: true, characterData: true })
      })
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, term)
      input.dispatchEvent(new Event('input', { bubbles: true }))
      await rerendered
      return performance.now() - start
    }, q)
    responseMs.push(duration)
  }
  await page.goto('/kanji/水')
  await expect(page.getByText('4 of 4 strokes complete')).toBeVisible()
  await page.reload()
  await expect(page.getByText('4 of 4 strokes complete')).toBeVisible()
  const detail = (await files()).filter(r => r.path.startsWith('/data/'))
  expect(detail.map(r => r.path.split('/').slice(-2).join('/')).sort()).toEqual(['20261109-v1/manifest.json', 'details/6c.json', 'strokes/6c.json'])
  expect(errors).toEqual([])
  console.log('Release measurements', JSON.stringify({ project: info.project.name, version: browser.version(), initial, detail, responseMs }))
})

test('long Japanese text and voice names fit the viewport and saved marks survive a visit to Speak', async ({ page }) => {
  await page.addInitScript(() => {
    const synth = Object.assign(new EventTarget(), {
      getVoices: () => [{ name: '日本語の音声'.repeat(40), voiceURI: 'test', lang: 'ja-JP', localService: true }],
      cancel() {}, speak() {},
    })
    Object.defineProperty(window, 'speechSynthesis', { value: synth })
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: class {} })
  })
  await page.goto('/kana')
  const opener = page.getByRole('button', { name: 'あ a', exact: true })
  await opener.press('Enter')
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('combobox', { name: 'Japanese voice' })).toBeVisible()
  expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true)
  await dialog.getByRole('button', { name: 'Favorite' }).click()
  await expect(dialog.getByRole('button', { name: 'Favorite' })).toHaveAttribute('aria-pressed', 'true')
  await page.keyboard.press('Escape')
  await expect(opener).toBeFocused()
  await page.getByRole('link', { name: 'Speak' }).click()
  await page.getByLabel('Japanese text').fill('あ'.repeat(300))
  await expect(page.getByRole('combobox', { name: 'Japanese voice' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await expect(page.getByText('Assessment unavailable')).toBeVisible()
  await page.getByRole('link', { name: 'Progress' }).click()
  await page.reload()
  await expect(page.locator('.saved-list li')).toContainText('あ')
})
