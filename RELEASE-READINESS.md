# Japanese Study release review

**13 November 2026. Ready for owner acceptance testing on HTTPS.** The static build passed the automated release checks below. Public hosting, physical-device audio, screen-reader speech, and Firefox/Safari compatibility still need verification. Phase 6B was skipped. Speak offers local recording and displays “Assessment unavailable.”

## Tested build

Windows, Node 24.21.0, npm 11.19.0, Vite 7.3.8. Playwright ran against Vite's local production preview, with two workers per browser run. Browser viewports were 900 CSS pixels high.

| Check | Observed result |
|---|---|
| Clean dependency install and production build | Passed. An isolated `npm ci` and `npm run build` reproduced all 337 files byte-for-byte. npm warned about the esbuild install script. The build succeeded with npm's existing settings. |
| Vitest unit and component suite | 38 passed, 0 failed, 0 skipped. |
| Python dictionary restriction test | 1 passed, 0 failed, 0 skipped. |
| Microsoft Edge 157.0.4341.46 | 120 passed, 0 failed, 0 skipped at 320, 375, 768, 1024 and 1440 px. |
| Google Chrome 157.0.8103.51 | 48 passed, 0 failed, 0 skipped at 375 and 1440 px. Both Chrome and Edge use Chromium. |
| Other browser executables | Firefox and WebKit failed before a test page opened. Playwright reported missing loadable DLLs. Launching the downloaded executables directly also failed. The standalone Chromium headless shell produced 48 launch failures with `spawn UNKNOWN`; those cases never exercised the app. The installed Google Chrome run above used the actual Chrome executable. |
| Dependency advisories | Initial full npm audit flagged three development packages. Updating Vitest to 4.1.12 removed the affected test dependencies/versions. The final full lockfile audit reported 0 known vulnerabilities. |

The browser suites covered direct entry and reload, navigation and restored focus, reduced-motion stroke stepping, light and dark themes, alternate readings, quiz history, marks across tabs, backup validation and rollback, Japanese voice selection, permission denial, cancellation and audio cleanup. A generated tone passed through the browser's actual audio encoder and player. A failed second take preserved the first. Automated WCAG A/AA scans of the tested views passed. The release cases also exercised a 300-character sentence and an unusually long Japanese voice name at each tested width.

Screenshots and browser run status are under `test-results/final-edge/` and `test-results/final-chrome/`. These are local QA artifacts. The default test command refreshes the test output directory.

## Performance and delivery

| Action | Observed on the final build |
|---|---|
| Open the app at its root | HTML 451 bytes, main JS 312,621 bytes, CSS 19,751 bytes. Vite estimates about 105.4 kB total gzip. The initial Kana chart requested neither stroke bundle nor the Kanji dictionary. |
| Open Kanji search | The 1,581,946-byte uncompressed index covers 13,108 characters. The page renders at most 24 matches at once. |
| Type five queries after the index is ready | In Edge at 1440 px, the five input-to-next-frame samples were 17.5, 13.4, 5.7, 14.7 and 6.9 ms. Chrome at 375 px ranged from 7.4 to 21.4 ms. Measured on this machine without CPU or network throttling, waiting for the result list to change. These are local interaction samples. |
| Open or reload a bookmark for 水 | Three catalog files totaling 87,983 decoded bytes: the manifest, one details file and one drawing file. The full search index was absent from this request path. |

Tailwind previously scanned incidental workspace content, so a clean build produced a different stylesheet. Scanning app sources explicitly reduced the working build's CSS from 24,311 to 19,751 bytes and made the outputs reproducible.

## Privacy, distribution and attribution

Reviewed the app's network and storage calls, backup validation, SVG rendering, and distribution layout. App fetches read same-origin catalog JSON. The recording service creates a local blob for replay, stops tracks, and revokes its URL on disposal. The backup format accepts character marks and bounded session results. Online synthesis voices carry a disclosure about the sentence text. Browser tests checked that the recording flow made no upload request.

The build contains only the HTML entry, compiled assets, catalog data, and licenses. Filename and common credential-signature checks found no reference ZIP, environment file, Git metadata, backups, source maps or matching secrets in the output. The importers extract path geometry and React constructs SVG elements. Raw imported SVG markup is distributed only in the downloadable compressed source archive. These checks cover this build and the inspected patterns.

| Material | Evidence in the release |
|---|---|
| KANJIDIC2 and JMdict | Notices, source release, transformations, and CC BY-SA 4.0 terms under `licenses/kanji/`. Rebuilding with the pinned input hashes reproduced all 323 catalog files and the separate 42-word practice deck. [EDRDG terms](https://www.edrdg.org/edrdg/licence.html) |
| KanjiVG | Notices and CC BY-SA 3.0 terms in the same directory. The manifest records 6,308 verified diagrams and the reasons for missing coverage. [KanjiVG licensing](https://kanjivg.tagaini.net/) |
| AnimCJK | Original sources for 148 kana glyphs and license texts under `licenses/animcjk/`. The shipped source archive matched the README SHA-256. COPYING and LGPL texts matched the pinned upstream Git objects. |
| Bundled software | The build now emits `licenses/software.md` with React, React DOM, React Router and Scheduler notices. `licenses/tailwindcss.txt` contains the upstream Tailwind CSS MIT notice. |

For a public dictionary site, the owner should check dictionary releases monthly, following EDRDG's update guidance. For a refresh, pin new dictionary inputs and hashes, rebuild both catalog and practice data using the README commands, bump the versioned data path, verify coverage and backups, and update the notices before publication. [EDRDG update guidance, section 4](https://www.edrdg.org/edrdg/licence.html)

## Hosting and owner acceptance

Serve the **contents of `dist/` at the site root over HTTPS**. The current router and data paths assume that root. Serve existing files first, including JSON, JavaScript, CSS and license downloads. Serve `index.html` on application navigations such as `/kana`, `/kanji/水`, `/practice`, `/speak` and `/progress`. Return a real 404 for a missing static asset. Enable gzip or Brotli, revalidate HTML, and use long-lived caching for hashed assets. No hosting target has been configured or deployed.

1. On the intended host, open and reload a bookmarked kanji and verify its drawing. Confirm a catalog JSON URL returns JSON and an absent asset returns 404.
2. On a phone and desktop, listen to Japanese at both speeds, record a short sentence, stop, and listen to your own take. Deny access, try another take, delete it, and leave Speak while recording. Check the device's microphone indicator turns off. Test Safari/iOS and Firefox on supported machines.
3. With a screen reader, follow the skip link, open a kana detail, step through strokes, and close it. Check the names and languages spoken, focus on return, quiz feedback, and the announcements for mic permission and recording. Automated scans establish only part of this behavior.
4. On the same host, export progress, import it in another profile, and verify both marks and practice history. Browser storage belongs to each origin.

## Reproducing the automated checks

From the project root in PowerShell:

```powershell
npm.cmd ci
npm.cmd run build
npm.cmd test
python scripts/data/test_import_kanji.py
npm.cmd audit
$env:PLAYWRIGHT_CHANNEL = 'msedge'
$env:PLAYWRIGHT_PORT = '4193'
npm.cmd run test:e2e -- --output=test-results/final-edge
```

For the user-installed Google Chrome on this machine:

```powershell
Remove-Item Env:PLAYWRIGHT_CHANNEL -ErrorAction SilentlyContinue
$env:PLAYWRIGHT_EXECUTABLE = Join-Path $env:LOCALAPPDATA 'Google/Chrome/Application/chrome.exe'
npm.cmd run test:e2e -- --project=chromium-375 --project=chromium-1440 --output=test-results/final-chrome
Remove-Item Env:PLAYWRIGHT_EXECUTABLE
```

On a machine that supports the corresponding Playwright build, use `npx playwright install firefox` or `npx playwright install webkit`, set `PLAYWRIGHT_BROWSER` to `firefox` or `webkit`, then run `npm run test:e2e` with no executable override.

Phase 7 changed `package.json` and `package-lock.json` for Vitest, `vite.config.ts` and `public/licenses/tailwindcss.txt` for software notices, `src/styles.css` for deterministic CSS, `playwright.config.ts` and `tests/e2e/release.spec.ts` for browser selection and release coverage, and the README and this report for handoff.
