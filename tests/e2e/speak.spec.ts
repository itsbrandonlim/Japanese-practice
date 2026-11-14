import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test('listens to typed sentences and reports denied or unavailable microphone access', async ({ page }) => {
  await page.addInitScript(() => {
    const voice = { lang: 'ja-JP', name: 'Test Japanese', voiceURI: 'local', localService: true }
    const synth = Object.assign(new EventTarget(), {
      getVoices: () => [voice],
      speak(u: SpeechSynthesisUtterance) { document.body.dataset.spoken = [u.text, u.lang, u.rate].join('/') },
      cancel() { document.body.dataset.stopped = 'yes' },
    })
    Object.defineProperty(window, 'speechSynthesis', { value: synth })
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: class { constructor(readonly text: string) {} } })
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { value: async () => {
      document.body.dataset.requested = 'yes'
      throw new DOMException('Denied', 'NotAllowedError')
    } })
  })
  await page.goto('/speak')
  const record = page.getByRole('button', { name: 'Enable microphone and record' })
  await expect(page.getByRole('heading', { name: 'Assessment unavailable' })).toBeVisible()
  await page.getByLabel('Japanese text').fill('   ')
  await expect(record).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Listen', exact: true })).toBeDisabled()
  await page.getByLabel('Japanese text').fill('これは本です。')
  await page.getByRole('combobox', { name: 'Speech speed' }).selectOption('.7')
  await page.getByRole('button', { name: 'Listen', exact: true }).press('Enter')
  await expect(page.locator('body')).toHaveAttribute('data-spoken', 'これは本です。/ja-JP/0.7')
  await expect(page.locator('body')).not.toHaveAttribute('data-requested', 'yes')
  await record.press('Enter')
  await expect(page.getByText(/permission was denied/)).toBeVisible()
  await expect(page.locator('body')).toHaveAttribute('data-stopped', 'yes')
  await page.getByRole('button', { name: 'Evening greeting' }).click()
  await expect(page.getByLabel('Japanese text')).toHaveValue('こんばんは。')
  await page.addInitScript(() => Object.defineProperty(window, 'MediaRecorder', { value: undefined }))
  await page.reload()
  await expect(page.getByText('Microphone recording is unavailable in this browser.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Listen', exact: true })).toBeEnabled()
})

test('encodes a generated tone, replays locally, preserves a prior take, and releases its resources', async ({ page }, info) => {
  await page.addInitScript(() => {
    let calls = 0
    const tracks: MediaStreamTrack[] = []
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { value: async () => {
      calls++
      if (calls === 2) throw new DOMException('Denied', 'NotAllowedError')
      const context = new AudioContext()
      const destination = context.createMediaStreamDestination()
      const oscillator = context.createOscillator()
      oscillator.connect(destination); oscillator.start()
      await context.resume()
      const track = destination.stream.getAudioTracks()[0]
      tracks.push(track)
      const stop = track.stop.bind(track)
      track.stop = () => { stop(); if (context.state !== 'closed') void context.close() }
      return destination.stream
    } })
    window.addEventListener('check-mic', () => {
      document.body.dataset.tracks = tracks.map(t => t.readyState).join('/')
    })
    const revoke = URL.revokeObjectURL.bind(URL)
    URL.revokeObjectURL = url => { document.body.dataset.revoked = url; revoke(url) }
  })
  await page.goto('/speak')
  const uploads: string[] = []
  page.on('request', r => { if (r.method() !== 'GET' && r.method() !== 'HEAD') uploads.push(r.url()) })
  await page.getByRole('button', { name: 'Enable microphone and record' }).click()
  await expect(page.getByText('Recording · microphone on')).toBeVisible()
  for (const colorScheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' })
    expect((await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze()).violations).toEqual([])
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
  await page.getByRole('button', { name: 'Stop recording' }).press('Enter')
  const player = page.locator('audio')
  await expect(player).toHaveAttribute('src', /^blob:/)
  await player.evaluate(async (el: HTMLAudioElement) => { el.muted = true; await el.play() })
  await expect.poll(() => player.evaluate((el: HTMLAudioElement) => el.currentTime)).toBeGreaterThan(0)
  const original = await player.getAttribute('src')
  await page.evaluate(() => dispatchEvent(new Event('check-mic')))
  await expect(page.locator('body')).toHaveAttribute('data-tracks', 'ended')
  await page.getByRole('button', { name: 'Record another take' }).click()
  await expect(page.getByText(/permission was denied/)).toBeVisible()
  await expect(player).toHaveAttribute('src', original!)
  if (info.project.name === 'chromium-320') await page.screenshot({ path: info.outputPath('speak-replay.png'), fullPage: true })
  await page.getByRole('button', { name: 'Delete recording' }).click()
  await expect(player).toHaveCount(0)
  await expect(page.locator('body')).toHaveAttribute('data-revoked', original!)
  await page.getByRole('button', { name: 'Enable microphone and record' }).click()
  await expect(page.getByText('Recording · microphone on')).toBeVisible()
  await page.getByRole('link', { name: 'Practice', exact: true }).click()
  await page.evaluate(() => dispatchEvent(new Event('check-mic')))
  await expect(page.locator('body')).toHaveAttribute('data-tracks', 'ended/ended')
  await page.goBack()
  await expect(player).toHaveCount(0)
  expect(uploads).toEqual([])
})

test('canceling a pending permission request ignores a late grant', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { value: () => new Promise(resolve => {
      window.addEventListener('grant-mic', () => resolve({
        getTracks: () => [{ stop: () => { document.body.dataset.released = 'yes' } }],
      }), { once: true })
    }) })
  })
  await page.goto('/speak')
  await page.getByRole('button', { name: 'Enable microphone and record' }).click()
  await expect(page.getByText(/Waiting for microphone permission/)).toBeVisible()
  await page.getByRole('button', { name: 'Cancel recording' }).press('Enter')
  await page.evaluate(() => dispatchEvent(new Event('grant-mic')))
  await expect(page.locator('body')).toHaveAttribute('data-released', 'yes')
  await expect(page.getByText('Recording canceled.')).toBeVisible()
  await expect(page.locator('audio')).toHaveCount(0)
})
