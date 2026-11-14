# EduQuest Spelling Bee — Python backend integration

This patch makes **Moski's Spelling Adventure** playable in a web browser without
running Pygame on the client. It adapts the Python game's original answer-checking
and three-lives/points rules, uses EduQuest's existing four difficulty CSV banks,
and adds a Next.js client that calls FastAPI.

## Apply the patch

Unzip this archive into the **existing EduQuest project root**. Preserve the
`website/` layout. Existing files at matching paths need to be overwritten.
The full patched source ZIP has the same changes already applied.

## Run locally

Use Python 3.11+ and a recent Node.js version compatible with your Next.js version.

Terminal 1:

```bash
cd website/backend
python -m venv .venv
# On Windows: .venv\\Scripts\\activate
# On macOS/Linux: source .venv/bin/activate
pip install -r requirements-spelling.txt
uvicorn api:app --reload --port 8000
```

Terminal 2:

```bash
cd website/frontend
cp .env.local.example .env.local    # Windows: copy .env.local.example .env.local
npm ci
npm run dev
```

Visit `http://localhost:3000/games/spelling` and start an Easy level.
The game needs both processes running. To check the backend first, open
`http://127.0.0.1:8000/health`.

## Production deployment

1. Deploy `website/backend` to a Python host such as Render/Railway. Build:
   `pip install -r requirements-spelling.txt`. Start:
   `uvicorn api:app --host 0.0.0.0 --port $PORT --workers 1`.
2. Set backend `FRONTEND_ORIGINS=https://YOUR-FRONTEND-DOMAIN` (comma-separated
   if you have multiple allowed domains).
3. Deploy `website/frontend` to a Next.js host such as Vercel. Set
   `NEXT_PUBLIC_API_BASE_URL=https://YOUR-BACKEND-DOMAIN` **before the build**.
4. Confirm `https://YOUR-BACKEND-DOMAIN/health` works and try a full Spelling Bee
   level in the browser. Allow browser speech output when prompted.

**No LMNT credentials are required.** The browser speaks the word via the Web
Speech API. The Pygame desktop window and audio mixer **cannot be imported
unchanged into a web server**. Python still owns scoring, lives, and answer
validation. Browser assets remain in `frontend/public/assets/images/`; the four CSV banks are copied under `backend/data/words/` so the Python API can be deployed separately from the frontend.

## Tests

```bash
cd website/backend
pip install pytest
python -m pytest tests/test_spelling_bee.py -q
python -m compileall -q api.py spelling_bee_service.py
```

## Known limitations

- Sessions are stored in Python process memory and expire after 60 minutes.
  Use **one backend worker**; a multi-replica deployment needs Redis/database sessions.
  Deployments/restarts reset active games. There is no login or persistent scoring.
- Speech voices/quality vary by browser and OS; a browser with Web Speech support
  is required for pronunciation.
- **This is a Spelling Bee repair, not a full-site deployment certification.**
  EduQuest's legacy `/formula_1` and `/wordQuest` audio routes depended on LMNT,
  which has discontinued service. This patch makes those endpoints return an
  explicit HTTP 503 instead of failing at server startup. Those games still
  need a separate browser speech migration.
- The patch does not upgrade the project's existing Next.js version, audit
  every game, or resolve all project-wide build warnings.
- Do not upload `.env` files or API secrets to your public repository.
