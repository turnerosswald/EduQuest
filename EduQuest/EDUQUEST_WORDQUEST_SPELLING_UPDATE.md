# EduQuest — WordQuest input and Spelling Bee sound/keyboard update

Date: 2026-11-14. This release is based on the user-provided
`EduQuest_Complete_Updated_2026-11-14 (1).zip` (not an older source archive).

## WordQuest

- Fixed duplicate handling of letters (`onChange` and `onKeyDown` had both been
  writing values), incorrect focus movement at word crossings, and clearing
  shared letters while checking a wrong guess.
- Each clue is tracked as solved independently. A correct word locks its cells
  and supplies letters to crossing words, which remain playable. A solved clue
  cannot award points twice.
- Click the clue to choose the word; click a crossing again to switch direction.
  Arrow keys navigate along a word, and Backspace clears an editable cell.
- The old click-a-clue-to-reveal mechanic was split into **select clue** and
  **Reveal** (costs points), to make crossing selection possible without
  accidentally spending points.
- Incorrect full guesses remain on screen for correction instead of erasing
  crossing letters. The original crossword art/board style is preserved.

## Spelling Bee

- After a correct spelling or after all three attempts, pressing Enter advances
  to the next word; the Next Word button still works.
- Added original sound effects (bundled in `public/assets/sounds/answer audios`):
  first/second/third answer clips according to remaining lives; final-answer
  clip for last round; level-completion and end-game sounds.
- Wrong attempts play `public/audio/wrong.mp3`.
- Added a Sound On/Off button in the spelling game header. Sound defaults on.
- Python FastAPI remains the source of truth for score, three attempts, and
  progression. Browser speech (Hear Word) remains separate from answer sounds.

## Start locally (two terminals)

From the extracted `EduQuest` root:

Terminal 1:

```powershell
cd website/backend
py -m pip install -r requirements-spelling.txt
py -m uvicorn api:app --reload --port 8000
```

Terminal 2:

```powershell
cd website/frontend
Copy-Item .env.local.example .env.local -Force
npm ci
npm run dev
```

Open `http://localhost:3000/games/wordQuest` and
`http://localhost:3000/games/spelling`.

If you apply the SMALL patch ZIP, extract it into the folder *containing* the
`EduQuest` folder. Verify that the resulting path is
`EduQuest/website/frontend/src/components/SpellingGame.js`. Restart the
frontend server and hard-refresh (Ctrl+Shift+R) to see the changes.

## Verification performed

- `node --test tests/crosswordLogic.test.mjs` — 5 tests passed.
- Puzzle generation + complete-answer checks for easy/medium/hard/extreme —
  passed, with 5/8/10/10 valid clues respectively in a sample run.
- `python -m pytest -q tests/test_spelling_api.py tests/test_spelling_bee.py`
  — 6 tests passed.
- TypeScript transpilation syntax checks for edited React files — passed.
- Original MP3 asset paths and file bytes checked.
- FULL Next.js production build **not verified**: `npm ci --offline` returned
  `ENOTCACHED` (missing `yocto-queue` package). Perform `npm ci && npm run build`
  locally with network access before deploying.
- Browser visuals/actual speaker playback **not verified** in this sandbox.
  Browser audio can be blocked by browser policies or a muted tab; use the
  Sound On switch and ensure your tab is unmuted.

## Files changed from supplied ZIP

- `website/frontend/src/app/games/wordQuest/components/CrosswordBoard.js`
- `website/frontend/src/app/games/wordQuest/components/styles.css`
- `website/frontend/src/app/games/wordQuest/utils/crosswordLogic.mjs` (new)
- `website/frontend/src/components/SpellingGame.js`
- `website/frontend/src/style/SpellingGame.css`
- `website/frontend/tests/crosswordLogic.test.mjs` (new)
- `EDUQUEST_WORDQUEST_SPELLING_UPDATE.md` (new)
