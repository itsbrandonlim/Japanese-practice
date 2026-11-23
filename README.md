# Kotoba Study

The shared page footer displays © 2026 Brandon Nicolas Marlim.

A browser-based Japanese learning project. Open Kana to switch between Hiragana and Katakana, study rōmaji and stroke order, or listen using an available Japanese voice. Open Kanji to search 13,108 dictionary entries by character, kana reading, or English meaning. The five main sections support system, light, and dark themes.

## Run locally

Use Node.js 24 and npm. From the project root, run:

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. The app uses React, TypeScript, React Router, Vite, and Tailwind CSS. The lockfile selects Rollup’s WebAssembly distribution for compatibility with Windows Application Control. No account or provider credentials are required.

## Verify the app

The [Phase 7 release report](RELEASE-READINESS.md) records the production build, browser and data checks, hosting configuration, and remaining device sign-off. Phase 6B was skipped.

```sh
npm run build
npm test
npx playwright install chromium
npm run test:e2e
```

The build type-checks the project and produces the static site in `dist/`. Playwright runs against that build, starts its own preview on port 4173, and covers widths of 320, 375, 768, 1024, and 1440 px. Leave that port free during the run. To use an installed Microsoft Edge browser instead of downloading Chromium, run these PowerShell commands after building:

```powershell
$env:PLAYWRIGHT_CHANNEL = 'msedge'
npm run test:e2e
```

For a manual check:

1. Open each section using the navigation. Reload a section and use the browser’s Back button. The title, main heading, and active navigation item should match the destination.
2. Start at `/kana` and press Tab. Use the skip link, then navigate with the keyboard. After client-side navigation, focus moves to the destination heading. With a screen reader, check that the new heading is announced.
3. Select Dark or Light and reload. Select System and change the device appearance while the page is open. The page should follow the device only in System mode.
4. Check both themes at all five widths, including with reduced motion enabled. Look for visible focus, legible Japanese characters, and room for every navigation link without horizontal scrolling.
5. Open あ and replay its three strokes. Pause mid-stroke, resume, change speed, and step backwards. With reduced motion enabled, use Start over and Next stroke. Try きゃ to see four strokes in the first character followed by three in the second. Escape should restore keyboard focus to the originating cell.
6. With an installed Japanese voice, listen at both rates, replay, stop, and close the dialog during playback. Test audibility and pronunciation on the intended device. The browser supplies the voices and may expose online voices, labeled in the selector. When the browser has no Japanese voice, the stroke tools remain available.
7. In Kanji, search for `water` or `みず`, filter to Grade 1 and four strokes, and open 水. Check the readings, radical, vocabulary, and diagram. Try Previous stroke, Replay, Pause, Resume, and reduced-motion stepping. Browser Back restores the search, filters, and page. Try 逢 to see how a stroke-count discrepancy is reported.
8. Open a Kana or Kanji detail, select Favorite or Learned, and reload. In Progress, filter the list by either mark and reopen a saved character. Turn off both marks to remove it from the list.
9. Export a backup. Open the app in a second browser profile, select the file under Import backup, review the character count, and choose Merge backup. Import it again and check that the counts stay the same. Try a malformed file and verify that your saved marks are still present.
10. In Practice, try a five-card kana quiz using only the keyboard. Answer one incorrectly and check the final review list. In a kanji vocabulary quiz, enter a reading in hiragana or katakana. In Flashcards, reveal one, choose Study again, then set each remaining card aside. Check that Progress shows a quiz score and a separate flashcard review count after reloading.

## Sentence listening and recording

Open **Speak** on localhost or HTTPS. Choose one of the three greetings or enter up to 300 characters of your own Japanese text. Choose a Japanese voice and speed, then select **Listen**. An online voice may send the sentence text to the device’s speech provider. The page identifies online voices before playback. The starter greetings were checked against [The Japan Foundation’s Irodori Starter, Lesson 1](https://www.irodori.jpf.go.jp/assets/data/starter/pdf/X_L01_au.pdf).

Select **Enable microphone and record** when ready. The first permission prompt comes from your browser. Stop to replay your take, or cancel to discard it. The app stops recording at 30 seconds and discards a take if it exceeds 4 MiB. A successful new take replaces the previous take. If permission is denied or the new recording fails, the previous take remains available. The replay panel keeps the sentence used for that take even if you edit the text.

The app holds one audio recording in tab memory and releases it when you delete it or leave Speak. Progress backups contain no sentence text or audio. **Assessment unavailable** is the current provider state for both starter phrases and typed text. External assessment would require separate approval of its processor, cost, region, retention and validation, plus the learner's consent to send a specific recording.

To check with your own device:

1. Run `npm run dev`, open the localhost URL, and choose Speak. Listen to a greeting, change speed and voice, then stop playback. Check the audible Japanese output. A phone accessing a computer by LAN IP requires HTTPS for microphone capture.
2. Record a short sentence. Check the browser's microphone indicator during capture and after Stop. Play the take, listen for your own voice, then record another. Leave a recording running to check the automatic 30-second stop.
3. Try denying permission, canceling before the permission prompt resolves, deleting a take, and navigating away during capture. Return to Speak and check that the audio is gone. Repeat on a target phone and with a screen reader.

The Phase 6A implementation changes `src/app/router.tsx`, `src/pages/SpeakPage.tsx`, `src/features/speak/speak.css`, `src/features/kana/Listening.tsx`, `src/services/recording.ts` and `src/services/assessment.ts`. Recording limit and cleanup checks are in `src/services/recording.test.ts`. Browser coverage is in `tests/e2e/speak.spec.ts`. It substitutes a generated tone for the physical microphone and exercises the browser's own recorder and replay controls.

Phase 6A verification on Windows used `npm.cmd run build`, `npm.cmd test`, and `npm.cmd run test:e2e` with `PLAYWRIGHT_CHANNEL=msedge`. The build passed, 38 unit/component tests passed, and 110 browser tests passed across 320, 375, 768, 1024 and 1440 px. Zero failed or skipped in the final runs. The recording view passed automated WCAG A/AA checks in light and dark themes at these widths. Physical microphones, audible speech, screen readers, Firefox and Safari remain manual checks.

## Practice

Choose five or ten different prompts. Each kana deck includes 104 chart entries (the three rare D-row combinations are available for reference in Kana). Each multiple-choice question has four distinct chart readings. The kanji deck asks for a reading of a whole word, accepts alternatives attested for its spelling in the pinned JMdict common subset, and normalizes width, surrounding spaces, and katakana/hiragana. Long vowels and small kana remain significant. The subset does not cover every dialect or proper name. Feedback shows the listed readings and one illustrative meaning; it does not grade spoken pronunciation.

Flashcards can be revealed, returned to the end of the queue, shuffled before reveal, or set aside for this session. Setting a card aside does not mark a character as learned. Only completed sessions enter history. Answer text and unfinished sessions are not stored.

The 42 vocabulary cards are derived from the JMdict archive listed below. To rebuild, run `python scripts/data/import-practice.py <source-folder>`. The importer checks the same pinned SHA-256, applies spelling, reading and sense restrictions, and retains source entry IDs in `src/features/practice/words.json`. See the [dictionary notices](public/licenses/kanji/NOTICE.txt).

Phase 5 checkpoint: `npm run build` passed; `npm test` passed 30 tests; `npm run test:e2e` passed 95 tests in Edge at 320, 375, 768, 1024 and 1440 px (zero failed or skipped in the final runs). Rebuilding the vocabulary deck from the pinned archive produced identical bytes. Browser checks included keyboard focus, light/dark accessibility scans, quiz scoring, flashcard repeats, upgrading a real version 1 IndexedDB, save failure/retry, deduplication and the 100-session retention limit. An immediate-reload failure found during verification was addressed by explicitly committing individual mark writes. Physical devices, assistive technology with speech output, Safari and Firefox were not tested for this checkpoint.

Files changed for this checkpoint:

- Practice route and interface: `src/app/router.tsx`, `src/pages/PracticePage.tsx`, `src/features/practice/{session.ts,results.ts,practice.css,words.json}`.
- Progress and backup changes: `src/pages/ProgressPage.tsx` and `src/features/progress/{storage.ts,backup.ts,BackupControls.tsx,progress.css}`.
- Data and documentation: `scripts/data/import-practice.py`, `public/licenses/kanji/NOTICE.txt`, and this README.
- Verification: `vite.config.ts`, `src/features/practice/session.test.ts`, `src/features/progress/backup.test.tsx`, and `tests/e2e/{practice.spec.ts,practice-storage.spec.ts}`.

## Local progress and backups

Favorite and Learned are independent. A kana combination counts as one study entry. The Progress page lists 24 entries per page. IndexedDB stores progress for the current browser profile and site origin. Tabs refresh after committed changes and on window focus. Clearing site data removes that profile’s progress. Use Export backup to keep a portable copy.

New exports use version 2, with a `results` array of completed sessions. Each records its ID, completion time, mode, deck, size, and correct-answer or extra-review count. Import merges sessions by ID and keeps the newest 100; an existing session wins if the same ID appears again. Theme preferences are separate. Version 1 backups still import, including this example:

```json
{
  "format": "japanese-study-progress",
  "version": 1,
  "entries": [
    { "char": "きゃ", "favorite": true, "learned": false },
    { "char": "水", "favorite": false, "learned": true }
  ]
}
```

Imports accept up to 2 MiB and 20,000 records. The app checks the format, version, exact fields, boolean marks, unique identifiers, and catalog membership before offering the merge. Kanji validation loads the site's published index. The backup file is processed in the browser. Importing combines marks in one IndexedDB transaction. A failed transaction rolls back, and importing the same file twice produces the same records. Version 1 is the first progress schema.

Direct links use ordinary paths such as `/kana` and `/kanji`. A future static host will need to serve `index.html` for application routes. The Korean reference ZIP remains under `references/` and is excluded from Git and the production build.

## Kana sources and coverage

Each script contains 46 basic entries, 25 forms with dakuten or handakuten, and 36 yōon pairs. Rare D-row pairs are labeled. The tables use modern pronunciation-based rōmaji, including *o* for を and ヲ. The chart covers modern core kana and contracted sounds. Historical kana and extended loanword combinations are outside this selection. Character readings were checked against the Japan Foundation’s Irodori Starter charts. [Hiragana, lesson 1, p. 14](https://www.irodori.jpf.go.jp/assets/data/starter/pdf/X_L01.pdf#page=14) · [Katakana, lesson 2, p. 15](https://www.irodori.jpf.go.jp/assets/data/starter/pdf/X_L02.pdf#page=15)

The two lazy-loaded stroke bundles cover 148 individual glyphs used by all 214 entries. They are derived from the Japanese Kana SVGs by FM-SH, copyright 2016–2026, under LGPL v3 or later, revision `c63765b150cbd567c71d05cf4a4f8d00b57045c9`. On 12 November 2026 the importer retained the stroke outlines and clipped drawing paths, grouped split segments by their upstream stroke number, and omitted embedded SVG styles and markup. The UI creates its own SVG elements and renders pairs in writing order. [Pinned upstream source](https://github.com/parsimonhi/animCJK/tree/c63765b150cbd567c71d05cf4a4f8d00b57045c9/svgsJaKana) · [Upstream licensing](https://github.com/parsimonhi/animCJK/blob/c63765b150cbd567c71d05cf4a4f8d00b57045c9/licenses/COPYING.txt)

To reproduce the bundles, check out that revision of AnimCJK with Git, install this project’s development dependencies, then run:

```sh
node scripts/data/import-kana.mjs <path-to-AnimCJK-checkout>
```

The importer validates character IDs, path grammar, clip references, and continuous stroke numbering. It writes the Hiragana and Katakana JSON into `src/features/kana/data/`. The build ships the license texts, upstream notice, and original SVG sources as a gzip-compressed JSON map in `public/licenses/animcjk/`. The distributed source archive has SHA-256 `2f4c1a8a5678f477eaaf0ec4e510201c1a1752ff46df1ffa061a1540fa31f85c`.

## Kanji catalog

The catalog includes every literal in the pinned KANJIDIC2 release. Of 13,108 entries, 10,384 have an English meaning, 12,356 have an on or kun reading, 3,543 have linked common vocabulary, and 6,308 have a verified stroke diagram. Derived dictionary data uses CC BY-SA 4.0. Derived KanjiVG paths use CC BY-SA 3.0. The credits identify the copyright holders and the transformations. [Local notices](public/licenses/kanji/NOTICE.txt) · [EDRDG license statement](https://www.edrdg.org/edrdg/licence.html) · [KanjiVG](https://kanjivg.tagaini.net/)

The catalog loads a 1.58 MB uncompressed search index on entry and displays 24 results per page. Exact matches precede partial matches. Kana matching accepts either script, half-width input, and readings with or without dictionary okurigana separators. Character identity uses the original Unicode scalar to preserve compatibility ideographs. Details and drawings load by Unicode block of 256 code points. A direct character URL loads its manifest and relevant files independently of the search index.

Study groups use KANJIDIC2’s grade codes. The app omits historical JLPT codes. Vocabulary shows up to three distinct common-entry IDs per character. The importer checks both reading and sense restrictions, includes English glosses, and favors common written/reading forms and short spellings. Each gloss illustrates one applicable sense. Coverage is limited to the common subset. KanjiVG matching requires an exact glyph ID, top-level character, sequential path IDs, and the dictionary’s primary stroke count. Missing files (6,691), count differences (108), and one differing character identity are recorded separately.

### Rebuild the Kanji data

Use Python 3.10 or newer. Ordinary app builds use the included files and do not need Python or network access. Download these exact inputs into a separate source folder, naming them as shown:

| Local filename | Pinned input |
|---|---|
| `kanjidic2-all.tgz` | [KANJIDIC2 all languages, 2026-11-09](https://github.com/scriptin/jmdict-simplified/releases/download/3.6.2%2B20261109214828/kanjidic2-all-3.6.2%2B20261109214828.json.tgz) |
| `jmdict-eng-common.tgz` | [JMdict common English entries, 2026-11-09](https://github.com/scriptin/jmdict-simplified/releases/download/3.6.2%2B20261109214828/jmdict-eng-common-3.6.2%2B20261109214828.json.tgz) |
| `kanjivg.zip` | [KanjiVG main diagrams, 2026-07-14](https://github.com/KanjiVG/kanjivg/releases/download/r20260714/kanjivg-20260714-main.zip) |

```sh
python scripts/data/import-kanji.py <source-folder>
python scripts/data/test_import_kanji.py
npm test
npm run build
```

The importer verifies all three SHA-256 hashes before parsing. It emits plain data and SVG path strings, without rendering imported markup. Use `--out <folder>` to compare a separate rebuild. The manifest records the input hashes, versions and measured coverage. [Catalog manifest](public/data/kanji/20261109-v1/manifest.json)
