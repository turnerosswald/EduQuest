"""EduQuest API. Spelling Bee gameplay stays in Python; Next.js provides the UI."""
import os
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from spelling_bee_service import start, answer, next_word, pronounce, end

app = FastAPI(title="EduQuest API")
allowed_origins = [x.strip().rstrip("/") for x in os.getenv(
    "FRONTEND_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000"
).split(",") if x.strip()]
app.add_middleware(CORSMiddleware, allow_origins=allowed_origins,
                   allow_methods=["GET", "POST"], allow_headers=["Content-Type"])


class StartRequest(BaseModel):
    level: str


class AnswerRequest(BaseModel):
    session_id: str
    guess: str = Field(max_length=128)


class SessionRequest(BaseModel):
    session_id: str


def game_call(fn, *args):
    try:
        return fn(*args)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get('/health')
def health():
    return {"ok": True}


@app.post('/spelling_bee/start')
def spelling_start(body: StartRequest):
    return game_call(start, body.level)


@app.post('/spelling_bee/answer')
def spelling_answer(body: AnswerRequest):
    return game_call(answer, body.session_id, body.guess)


@app.post('/spelling_bee/next')
def spelling_next(body: SessionRequest):
    return game_call(next_word, body.session_id)


@app.post('/spelling_bee/pronounce')
def spelling_pronounce(body: SessionRequest):
    return {"word": game_call(pronounce, body.session_id)}


@app.post('/spelling_bee/end')
def spelling_end(body: SessionRequest):
    end(body.session_id)
    return {"ok": True}


# Legacy audio endpoints are retained to avoid changing old frontend contracts.
# LMNT has discontinued its TTS service; browser speech is used by the new game.
class LegacySpeechRequest(BaseModel):
    question: str | None = None
    word: str | None = None


@app.post('/formula_1')
@app.post('/wordQuest')
async def legacy_audio(body: LegacySpeechRequest):
    raise HTTPException(status_code=503,
                        detail="Legacy hosted speech generation is unavailable. This game requires a browser-speech migration.")


if __name__ == '__main__':
    import uvicorn
    uvicorn.run("api:app", host="127.0.0.1", port=8000, reload=True)
