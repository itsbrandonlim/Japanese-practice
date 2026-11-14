# AGENTS.md — Japanese Learning Website

## Mission
Build a trustworthy, accessible, responsive Japanese learning application for Hiragana, Katakana, and a comprehensive Kanji catalog. The Korean website ZIP supplied by the owner is a **reference**, not a codebase to blindly copy. Prefer maintainable, testable implementation over rapid feature volume.

## Mandatory workflow
1. Start in **Phase 0 (inspection only)**. Examine the repository, Korean reference, package manifests, assets, licenses, existing tests, and available runtime. Present architecture, data sources, risks, validation, and exact proposed changes; **do not change files** before owner approval.
2. Implement one approved phase at a time. Do not begin the next phase, push, deploy, install paid services, or provision infrastructure without explicit owner approval.
3. Before editing, summarize intended files/behavior. After editing, report changed files, commands, observed test outcomes, failures, limitations, and manual verification instructions. Do not claim checks ran unless they actually ran.
4. Preserve user code and existing functionality. Never overwrite or discard unrelated work. Check repository diff before commits; never commit or expose secrets.
5. When blocked by missing assets, paid provider access, or unsupported browser APIs, use a documented interface/fallback and report the blocker; do not fake the feature or fabricate results.

## Preferred stack
- React + TypeScript (strict) + Vite + Tailwind CSS, subject to Phase 0 findings.
- React Router where routes materially help; typed data-access and feature services.
- Static verified datasets and SVG assets, loaded incrementally; IndexedDB for structured user progress and localStorage for theme and lightweight settings.
- Vitest + React Testing Library; Playwright end-to-end tests for desktop and mobile viewports.
- No database, identity provider, or backend for initial character learning and browser-only recording.
- A narrowly scoped backend/serverless proxy **may be proposed** for third-party pronunciation-assessment credentials and secure processing; only implement with approval. Never place provider secrets in Vite public variables or client bundles.

## Language-data integrity
- Kana: gojūon, dakuten/handakuten, yōon; label unusual/historical forms.
- Kanji: large searchable catalog with staged data loading, pagination/virtualization, reliable readings/meanings, stroke counts, and sourced study classifications. JLPT study levels are unofficial groupings, not official definitive lists.
- Investigate AnimCJK/KanjiVG for stroke-order SVGs and KANJIDIC/JMdict for metadata and vocabulary. Record source version, coverage, licenses, required attribution, and transformation steps before redistribution.
- NEVER invent character readings, stroke sequences, pitch accents, glosses, audio quality, or missing metadata. Mark unsupported data as unavailable.
- Validate normalization, duplicates, references, coverage, and mapping between SVG and character IDs.
- Treat imported SVG and dataset content as untrusted; avoid unsafe HTML/SVG injection.

## Product features
1. Responsive character tables and accessible character details for Hiragana, Katakana, Kanji.
2. Real SVG stroke-order animations: replay, pause, step, speed, reduced-motion fallback, unavailable-asset state.
3. Japanese text-to-speech (`ja-JP`) with voice selection where available, speed, stop/replay, and unsupported-voice feedback.
4. Sentence practice: input sentence, listen, explicitly enable microphone, record, stop, local replay, optionally submit for assessment with separate consent.
5. Search/filter; favorites and learned status; local quiz/flashcard results; safe validated progress import/export.
6. Light/dark/system themes; readable mobile grids rather than unreadably shrunken tables.

## Pronunciation-assessment integrity
- **Speech recognition/transcript similarity is not pronunciation assessment.** Do not convert recognized text match into a fake accuracy score.
- Implement separable `SpeechSynthesisService`, `RecordingService`, and `PronunciationAssessmentProvider` interfaces. Prefer a fully usable listen/record/replay flow even without provider credentials.
- For genuine scored feedback, research a provider/model with **documented `ja-JP` assessment support**, Japanese-specific measurable dimensions, available score granularity, cost, regions, retention, and limitations. Confirm features rather than inferring them from English-language support.
- Candidate: Azure Speech Pronunciation Assessment supports `ja-JP` but its **prosody scoring is documented as `en-US` only**; do not promise Japanese pitch-accent or prosody scores from this provider. Expose only supported and validated metrics, such as accuracy/fluency/completeness where actually returned.
- For pitch accent, require an appropriate Japanese-specific validated model or curated feedback; do not infer accent correctness from generic speech recognition or pitch height alone. Japanese has mora timing, long vowels, geminates, devoicing, and context-dependent pitch accent: feedback must be cautious and useful.
- Display score provenance, dimensions, uncertainty, and limits. Avoid framing numeric scores as native-speaker certification. Compare against fixed scripted reference phrases for consistent assessment; user-typed free-form assessment may be unsupported or lower-confidence.
- Do not send audio to third parties before informed consent. Explain processor, region if known, cost implications, and retention. Microphone access requires user action; show recording state; permit cancel/delete; default not to save audio. Limit recording duration and file size; validate MIME/content and apply rate limits if a backend is introduced.
- API keys/token minting must remain server-side. Use HTTPS, narrowly scoped short-lived auth where possible, no raw audio/request logging by default, restrictive CORS, server-side limits, error handling, and abuse controls.
- If assessment credentials are absent, the interface must say "Assessment unavailable" while listen, record, and replay remain operational; never show fabricated scores.

## Accessibility and responsive quality
- Verify 320, 375, 768, 1024, and 1440px, no unintended page overflow, keyboard operation, readable Japanese fonts, visible focus, semantic roles, WCAG AA contrast targets, reduced motion, screen-reader announcements, and touch controls.
- Use lazy loading, bounded rendering, virtualization/pagination for large datasets; never eagerly mount thousands of SVG animation components.

## Test and evidence requirements
- Unit: data import/validation, Japanese search, quiz scoring, storage migrations, export/import, score normalization, permissions/state transitions.
- Component: table navigation, detail views, themes, favorites, TTS/recording state/errors, assessment consent and unavailable states.
- E2E (Playwright): desktop/mobile navigation, filters, stroke controls, favorites persistence, quiz, sentence text-to-speech state, mic denied/unsupported, assessment consent, backend errors, no-score fallback.
- Mock media/assessment APIs in CI; manually verify microphone, actual sound output, and external assessment against real devices and a small consented Japanese reference-audio set, with expert-reviewed expectations. Include false-positive/false-negative cases and noisy audio.
- Report factual pass/fail/skip counts, blocked checks, artifacts, and remaining risks. Do not modify assertions solely to make tests green.


## Inspected Korean reference — `hangeul-cards(1).zip` (12 November 2026)
The reference was reviewed as an archive, not executed. Grounded findings:
- App is **vanilla HTML/CSS/ES modules** under `hangeul-cards/dist/`, using `dist/index.html`, `dist/app.js`, `dist/deck.js`, `dist/style.css`; `server.mjs` is a Node HTTP server, using PostgreSQL through `pg` and `compose.yaml` with a local Docker database. Its `package.json` uses Node test runner rather than React/Vite.
- Useful behavior/design patterns to **study and reimplement**, not blindly copy: minimalist white/charcoal/forest-green palette (`DESIGN.md`), practice reveal/keep/remove/shuffle deck (`dist/deck.js`), vocabulary form and compact list, theme toggle, slow speech playback using a local Korean voice, validated import/export, a11y status messages and reduced-motion/media queries, dictionary suggestion ranking, and documented QA checks (`QA.md`).
- The reference's Korean dictionary, Korean romanization, `ko` voice selection, 28,836-headword dictionary bundle, Node/PostgreSQL single-JSONB snapshot model, database backups, SQL server and Docker setup are **not** requirements or data sources for the new Japanese product. Do not reuse Korean-language assets or dictionary data.
- **Security:** Archive includes a `.env` file, `.git/` metadata, `node_modules/`, `backups/`, and `__MACOSX/` entries. Treat `.env` as potentially sensitive, never print/copy/commit it, and never use its database credentials. Do not bring historical commits, runtime dependencies, backups, or machine-specific files into the new repository. If any live secret is discovered, recommend rotation without exposing its value. Inspect archive paths safely; reject path traversal/symlink escapes.
- Reference tests exist: `test.mjs`, `suggestions.test.mjs`, `server.test.mjs`. Review their **behavioral intentions** (session invariants, input validation, concurrency handling), not their exact Node/PostgreSQL implementation.
- `QA.md` claims prior browser/device test coverage; treat those as reference notes, **not evidence** that the new Japanese website passed any checks.
- Use the supplied screenshots only as visual references. A new layout needs dense kana tables, Kanji paging, stroke-order viewer, sentence/audio interface, microphone states, and smaller-screen navigation; do not transplant the Korean two-tab IA.
- During Phase 0, present a **reuse / redesign / discard** matrix with filenames and reasons; propose screen architecture and migration boundaries. Do not change user files.

## Phase gates
- **0 Inspection and design** — no edits; audit ZIP and determine licenses/provider feasibility.
- **1 Foundation** — routes, responsive shell, themes, reusable components.
- **2 Kana** — accurate kana tables, stroke animation, listening audio.
- **3 Kanji** — licensed dataset pipeline and scalable catalog.
- **4 Progress** — IndexedDB/localStorage, favorites, export/import.
- **5 Quizzes** — question bank, answer handling, scoring.
- **6 Sentence practice** — listen, permission-based record/replay, assessment provider interface and privacy UI; provider integration **only if approved and feasible**.
- **7 Quality and release** — Playwright cross-viewport checks, accessibility, security/license review, docs, deployment-readiness report. Never auto-deploy.

## Definition of done (per phase)
Acceptance tests pass or explicitly document blockers; no severe regression or secret leak; reliable citations/licenses for imported content; mobile/keyboard/contrast checks for changed UI; README and test instructions updated; owner approval requested for next phase.

