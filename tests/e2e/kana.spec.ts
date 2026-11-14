import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test('opens both scripts, partial stroke playback, keyboard close and restored focus', async ({ page }) => {
  await page.goto('/kana')
  const opener = page.getByRole('button', { name: 'あ a', exact: true })
  expect(await opener.evaluate(el => el.clientWidth >= el.closest('td')!.clientWidth - 2)).toBe(true)
  await opener.focus()
  await page.keyboard.press('Enter')
  const detail = page.getByRole('dialog')
  await expect(detail.getByText('3 of 3 strokes complete')).toBeVisible()
  await detail.getByLabel('Stroke speed').selectOption('.5')
  await detail.getByRole('button', { name: 'Replay strokes' }).click()
  await expect(detail.locator('path[stroke-dashoffset]').first()).toBeVisible()
  await detail.getByRole('button', { name: 'Pause' }).click()
  await expect(detail.getByRole('button', { name: 'Resume' })).toBeEnabled()
  await detail.getByRole('button', { name: 'Next stroke' }).click()
  await expect(detail.getByText('1 of 3 strokes complete')).toBeVisible()
  await detail.getByRole('button', { name: 'Previous stroke' }).click()
  await expect(detail.getByText('0 of 3 strokes complete')).toBeVisible()
  await detail.getByLabel('Stroke speed').selectOption('2')
  await detail.getByRole('button', { name: 'Resume' }).click()
  await expect(detail.getByText('3 of 3 strokes complete')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(detail).toHaveCount(0)
  await expect(opener).toBeFocused()
  await page.getByRole('button', { name: 'Katakana' }).click()
  await page.getByRole('button', { name: 'Voiced' }).click()
  await page.getByRole('button', { name: 'パ pa', exact: true }).click()
  await expect(detail.getByText('3 of 3 strokes complete')).toBeVisible()
})

test('steps a complete yōon pair in reduced motion and identifies rare spellings', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/kana')
  await page.getByRole('button', { name: 'Combined' }).click()
  await expect(page.getByRole('button', { name: /rare/ })).toHaveCount(3)
  await page.getByRole('button', { name: 'きゃ kya' }).click()
  const detail = page.getByRole('dialog')
  await expect(detail.getByRole('img')).toHaveCount(2)
  await expect(detail.getByText('7 of 7 strokes complete')).toBeVisible()
  await detail.getByRole('button', { name: 'Start over' }).click()
  for (let step = 1; step <= 7; step++) {
    await detail.getByRole('button', { name: 'Next stroke' }).click()
    await expect(detail.getByText(step + ' of 7 strokes complete')).toBeVisible()
  }
  await expect(detail.getByRole('button', { name: 'Next stroke' })).toBeDisabled()
  await expect(detail.getByRole('button', { name: 'Replay strokes' })).toHaveCount(0)
  expect(await detail.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true)
  for (const colorScheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' })
    const issues = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
    expect(issues.violations).toEqual([])
  }
  if (page.viewportSize()?.width === 320) await page.screenshot({ path: testInfo.outputPath('pair.png') })
})

test('updates available Japanese voices, speaks the selected text and rate, and handles cancellation and errors', async ({ page }) => {
  await page.addInitScript(() => {
    let ready = false
    let active: SpeechSynthesisUtterance | null = null
    const synth = Object.assign(new EventTarget(), {
      getVoices: () => ready ? [
        { lang: 'en-US', name: 'English', voiceURI: 'en' },
        { lang: 'ja-JP', name: 'Japanese A', voiceURI: 'ja-A', localService: true },
        { lang: 'ja-JP', name: 'Japanese B', voiceURI: 'ja-B', localService: true },
      ] : [],
      speak(u: SpeechSynthesisUtterance) {
        active = u
        document.body.dataset.speech = [u.text, u.lang, u.voice?.voiceURI, u.rate].join('/')
      },
      cancel() { active = null; document.body.dataset.cancelled = 'yes' },
    })
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: class {
      constructor(readonly text: string) {}
    } })
    Object.defineProperty(window, 'speechSynthesis', { value: synth })
    window.addEventListener('test-voices', () => { ready = true; synth.dispatchEvent(new Event('voiceschanged')) })
    window.addEventListener('test-end', () => active?.onend?.call(active, {} as SpeechSynthesisEvent))
    window.addEventListener('test-error', () => active?.onerror?.call(active, {} as SpeechSynthesisErrorEvent))
  })
  await page.goto('/kana')
  await page.getByRole('button', { name: 'い i', exact: true }).click()
  await expect(page.getByText(/No Japanese voice/)).toBeVisible()
  await page.evaluate(() => window.dispatchEvent(new Event('test-voices')))
  await expect(page.getByLabel('Japanese voice').locator('option')).toHaveCount(2)
  await page.getByLabel('Japanese voice').selectOption('ja-B')
  await page.getByLabel('Speech speed').selectOption('.7')
  await page.getByRole('button', { name: 'Listen', exact: true }).click()
  await expect(page.locator('body')).toHaveAttribute('data-speech', 'い/ja-JP/ja-B/0.7')
  await page.getByRole('button', { name: 'Stop audio' }).click()
  await expect(page.locator('body')).toHaveAttribute('data-cancelled', 'yes')
  await page.getByRole('button', { name: 'Listen', exact: true }).click()
  await page.evaluate(() => window.dispatchEvent(new Event('test-end')))
  await page.getByRole('button', { name: 'Listen again' }).click()
  await page.evaluate(() => window.dispatchEvent(new Event('test-error')))
  await expect(page.getByText(/voice could not play/)).toBeVisible()
  await page.evaluate(() => delete document.body.dataset.cancelled)
  await page.getByRole('button', { name: 'Listen', exact: true }).click()
  await page.getByRole('button', { name: 'Close' }).click()
  await expect(page.locator('body')).toHaveAttribute('data-cancelled', 'yes')
})

test('reports unavailable stroke assets and unsupported speech independently', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(window, 'speechSynthesis', { value: undefined }))
  await page.route('**/assets/Hiragana-*.js', route => route.abort())
  await page.goto('/kana')
  await page.getByRole('button', { name: 'え e', exact: true }).click()
  await expect(page.getByText('Stroke order unavailable.')).toBeVisible()
  await expect(page.getByText('Speech playback is unavailable in this browser.')).toBeVisible()
  await page.getByRole('button', { name: 'Close' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
})
