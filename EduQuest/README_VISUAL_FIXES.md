# EduQuest: WordQuest + Spelling Bee visual fixes

This visual update applies **on top of** `EduQuest_SpellingBee_Patched_Full.zip`.
It does not replace the existing Spelling Bee Python/FastAPI integration.

## Fixes

- **WordQuest:** Removed the missing `/images/1.jpg` - `/images/36.jpg` random backgrounds and a `height: 0vh` container. WordQuest now uses existing `/images/background_home.webp`, with `cover` and centered positioning; no body-global background manipulation.
- **WordQuest game:** Moved clue panel out of `position: fixed` and into responsive layout beside the board on desktop / underneath on narrow screens. Small devices can scroll the grid horizontally. Previously global CSS rules were scoped to WordQuest.
- **WordQuest audio:** 'Play' buttons use the browser's speech synthesis rather than the previous hard-coded localhost API which returned 503 after LMNT shutdown. Interaction sound effects instantiate only in the browser.
- **Spelling Bee:** Trimmed 1560x1560 transparent Oski source down to an appropriately padded 596x804 character image. Moski now sits consistently beside the game panel (or below it on narrow screens).
- **Spelling Bee backgrounds:** Keeps the actual 9600x5400 source art at correct aspect ratio, without stretching, with a tuned overlay and responsive positioning. Background crop will naturally vary with screen aspect ratio.

## Run

Use the **full** ZIP, extract it, then run the two terminals as before:

```powershell
# Terminal 1 from the extracted EduQuest root
cd website/backend
py -m pip install -r requirements-spelling.txt
py -m uvicorn api:app --reload --port 8000
```

```powershell
# Terminal 2 from the extracted EduQuest root
cd website/frontend
Copy-Item .env.local.example .env.local
npm ci
npm run dev
```

Visit `http://localhost:3000/games/wordQuest` and `http://localhost:3000/games/spelling`.

## Scope and limitations

- Existing gameplay was not comprehensively regression-tested by this visual patch.
- The changes are source/CSS changes; no new illustration content or detail was added to the background images. The scaling and layout are what changed.
- A clean full Next.js build requires `npm ci` and should be checked locally before deployment.
- Browsers must support Web Speech API for reading WordQuest clues and Spelling Bee prompts aloud.
- The earlier Spelling Bee backend still needs to be started for its gameplay.
