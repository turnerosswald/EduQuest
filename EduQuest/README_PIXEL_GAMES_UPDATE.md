# EduQuest — Pixel Cards, Play Buttons & Spelling API Fix

## What changed (relative to `EduQuest_Original_Buttons_Restored_Full.zip`)

- `website/frontend/src/app/games/page.tsx`: replaced four hard-to-click videos (including an invalid `src-=` attribute and a missing WordQuest video) with **four named game cards and real Play Game links**.
- `website/frontend/src/app/games/games.css`: new square-cornered, heavy-border pixel-card design based on existing EduQuest assets; responsive 2-column/1-column grid.
- `website/frontend/src/style/SpellingGame.css`: pixel-border play panel/status boxes; original green game buttons, background, and Moski positioning kept.
- `website/frontend/src/components/SpellingGame.js`: replaced direct browser `127.0.0.1:8000` access with same-origin Next.js `/api/spelling_bee/*`; added backend connection status and Retry Connection button.
- `website/frontend/src/app/api/spelling_bee/[action]/route.ts`: **new Next.js server-side proxy** forwarding to the Python/FastAPI API. Includes GET `/api/spelling_bee/health`, POST start/answer/next/pronounce/end, timeout, and visible error details. Browser no longer needs CORS permissions to reach the backend.
- `website/frontend/.env.local.example`: renamed variable to **server-only** `SPELLING_API_URL`.
- `website/frontend/src/app/games/wordQuest/components/HomePage.js` and `styles.css`: pixel-framed intro and crossword clue panels. Original gray/purple WordQuest difficulty buttons are preserved.

## Run locally (two terminals from EduQuest folder)

**Terminal 1 — Python backend:**

```powershell
cd website/backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements-spelling.txt
python -m uvicorn api:app --reload --port 8000
```

**Terminal 2 — Next.js:**

```powershell
cd website/frontend
Copy-Item .env.local.example .env.local
npm ci
npm run dev
```

Then visit:

- `http://localhost:3000/games` — **all four game launch cards**.
- `http://localhost:3000/games/spelling` — Spelling Bee.
- `http://localhost:3000/api/spelling_bee/health` — should show `{ "ok": true }` when Python is running. If it returns 503 with a message, make sure Terminal 1 is running and check `.env.local`.
- `http://localhost:8000/health` — direct Python backend test.

**Important:** Running only `npm run dev` does NOT start Python. The Next.js API proxy handles URLs and browser requests, but Python still must be running separately. If you edit `.env.local`, restart Next.js. Hard-refresh the browser after replacing files.

## Deploy

Deploy `website/frontend` to Vercel and `website/backend` to a persistent Python web service (e.g. Render/Railway):

- Python start command from `website/backend`: `uvicorn api:app --host 0.0.0.0 --port $PORT --workers 1` (one worker matters because spell sessions are currently stored in Python process memory).
- Python packages: `pip install -r requirements-spelling.txt`.
- Vercel project root: `website/frontend`; environment `SPELLING_API_URL=https://YOUR-PYTHON-API-HOST` **without** the `/spelling_bee` suffix. The env variable must be available to the Next.js *server*.
- Browser calls `/api/spelling_bee/...` automatically; **do not** put the Python URL in `NEXT_PUBLIC_API_BASE_URL` for Spelling Bee. FastAPI CORS settings are not required for these proxied spelling requests.
- Check `https://YOUR-FRONTEND-HOST/api/spelling_bee/health` before testing games.

## Verification and limitations

- Python spelling tests: `python -m pytest -q backend/tests/test_spelling_bee.py backend/tests/test_spelling_api.py` → **6 passed** during patch creation.
- This environment did **not** complete `npm ci` because the npm install stalled (offline cache was incomplete); therefore **Next.js production build not verified here**.
- Other legacy games may still need separate audio/API fixes. This patch specifically addresses Spelling Bee API and the game selection interface.
