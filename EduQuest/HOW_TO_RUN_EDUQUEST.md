# EduQuest — repaired source files (November 14, 2026)

This folder contains actual source code (not just CSS snippets). It combines:
- The latest Game Selection pixel-art cards and real PLAY GAME buttons (`/games`).
- The earlier user-supplied connected-crossword generator and WordQuest board, plus browser speech
  and responsive clue/board styling (`/games/wordQuest`).
- The Next.js Spelling Bee interface, same-origin API proxy, Python/FastAPI game service, word banks,
  and improved Moski/background framing (`/games/spelling`).

## Start on Windows (two terminal windows)

Extract the FULL ZIP. Open the extracted `EduQuest` folder in VS Code. In terminal 1:

```powershell
cd website/backend
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements-spelling.txt
.\.venv\Scripts\python.exe -m uvicorn api:app --reload --port 8000
```

Keep terminal 1 running, and open terminal 2 **from the EduQuest folder**:

```powershell
cd website/frontend
Copy-Item .env.local.example .env.local -Force
npm ci
npm run dev
```

Verify these pages:
- http://localhost:3000/games — title **Choose Your Quest!**, four pixel game cards, PLAY GAME links.
- http://localhost:3000/games/wordQuest — interconnected crossword.
- http://localhost:3000/games/spelling — spelling gameplay.
- http://localhost:8000/health — must return `{"ok":true}`.
- http://localhost:3000/api/spelling_bee/health — must also return `{"ok":true}`.

## If Games still shows small videos

This means an older project is running, or a stale Next.js process is serving the port.
1. Stop the old `npm run dev` process (Ctrl+C in its terminal).
2. In your new EduQuest `website/frontend` directory check:
   `Select-String -Path .\src\app\games\page.tsx -Pattern 'Choose Your Quest'`
   You **must** see a match.
3. Delete `.next` if it exists: `Remove-Item -Recurse -Force .next`
4. Start `npm run dev` in the updated frontend folder, visit the exact URL printed by Next.js, then
   hard-refresh (Ctrl+Shift+R). If Next.js chose port 3001 because 3000 is occupied, open **3001**.

## If Spelling Bee says server offline

Starting only Next.js is not enough: it uses a separate Python game server.
Check `http://localhost:8000/health`; the Python terminal must remain open.
In `website/frontend/.env.local`, use `SPELLING_API_URL=http://127.0.0.1:8000`.
Restart `npm run dev` after changes to `.env.local`. Check the `/api/spelling_bee/health` URL.

## If applying the small PATCH ZIP instead

The patch paths begin `website/...`. Unzip into the **EduQuest repository root**, the folder that
contains `website`, replacing existing files. The patch assumes the original project is present.
Then reinstall dependencies if necessary and restart both servers.

## Verification performed for this delivered package

- Python backend tests: `6 passed` (pytest).
- Connected-crossword generator: tested all 4 difficulty levels for nonempty boards and consistent crossings.
- ZIP integrity: validated after creation.
- A full Next.js production build was **not** verified: installed `node_modules/next` is incomplete
  in this environment (`next: not found`). Do not treat this package as a production-certified deployment.
- The other legacy games may need additional audio/API deployment work.

No `.env.local` containing credentials is included.
