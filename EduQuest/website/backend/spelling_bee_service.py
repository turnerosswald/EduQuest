"""Browser-friendly Python spelling-game engine adapted from the uploaded Pygame project.

The Pygame window/mixer/event loop cannot run inside an HTTP process, so this
module preserves gameplay rules (three attempts, points by remaining lives)
and uses EduQuest's existing CSV word banks. No desktop GUI or TTS API required.

Sessions are in memory: deploy the backend with one worker, or substitute a
shared Redis/database session store before running multiple workers.
"""
from __future__ import annotations

import csv
import random
import re
import secrets
import threading
import time
from dataclasses import dataclass, field
from pathlib import Path

LEVELS = ("Easy", "Medium", "Hard", "Final")
WORDS_PER_ROUND = 15
SESSION_TTL = 60 * 60
BANK_FOLDER = Path(__file__).resolve().parent / "data" / "words"
_lock = threading.RLock()
_sessions: dict[str, "Session"] = {}


@dataclass
class Session:
    level: str
    words: list[dict[str, str]]
    index: int = 0
    score: int = 0
    correct: int = 0
    lives: int = 3
    result: dict | None = None
    updated_at: float = field(default_factory=time.time)

    @property
    def completed(self) -> bool:
        return self.index >= len(self.words)

    @property
    def current_word(self) -> dict[str, str] | None:
        return None if self.completed else self.words[self.index]

    def public_state(self, session_id: str) -> dict:
        word = self.current_word
        text = word["sentence"] if word else ""
        answer = word["word"] if word else ""
        if word:
            pattern = re.compile(r"\b" + re.escape(answer) + r"\b", re.IGNORECASE)
            hidden = pattern.sub("_" * len(answer), text)
            if hidden == text:
                hidden = "Listen to the word and spell it."
        else:
            hidden = ""
        hint = None
        if word and self.result is None:
            if self.lives == 2:
                hint = f"The word has {len(answer)} letters."
            elif self.lives == 1:
                hint = f"The word has {len(answer)} letters and starts with {answer[0].upper()}."
        return {
            "session_id": session_id,
            "level": self.level,
            "prompt": hidden,
            "score": self.score,
            "correct": self.correct,
            "lives": self.lives,
            "round_number": min(self.index + 1, len(self.words)),
            "round_total": len(self.words),
            "completed": self.completed,
            "hint": hint,
            "result": self.result,
        }


def load_bank(level: str) -> list[dict[str, str]]:
    if level not in LEVELS:
        raise ValueError("Choose Easy, Medium, Hard, or Final.")
    path = BANK_FOLDER / f"OP EduQuest Spelling Game Word Bank - 850{level}.csv"
    with path.open(newline="", encoding="utf-8-sig") as handle:
        data = csv.DictReader(handle)
        records = [
            {"word": (row.get("word") or "").strip(),
             "sentence": (row.get("sentence") or "").strip()}
            for row in data
        ]
    records = [x for x in records if x["word"] and x["sentence"]]
    # No repeated answers in one round, even if the CSV includes duplicates.
    unique = list({x["word"].casefold(): x for x in records}.values())
    if not unique:
        raise RuntimeError(f"No usable words in {path.name}")
    return unique


def _get(session_id: str) -> Session:
    session = _sessions.get(session_id)
    if not session or time.time() - session.updated_at > SESSION_TTL:
        _sessions.pop(session_id, None)
        raise KeyError("Session not found or expired. Start a new game.")
    session.updated_at = time.time()
    return session


def start(level: str) -> dict:
    bank = load_bank(level)
    words = random.SystemRandom().sample(bank, min(WORDS_PER_ROUND, len(bank)))
    session_id = secrets.token_urlsafe(24)
    with _lock:
        expired = [k for k, v in _sessions.items() if time.time() - v.updated_at > SESSION_TTL]
        for k in expired:
            del _sessions[k]
        _sessions[session_id] = Session(level=level, words=words)
        return _sessions[session_id].public_state(session_id)


def answer(session_id: str, guess: str) -> dict:
    with _lock:
        session = _get(session_id)
        if session.completed:
            raise ValueError("The game is already complete.")
        if session.result is not None:
            raise ValueError("Click Next Word before submitting again.")
        if not guess.strip():
            raise ValueError("Type a spelling before submitting.")
        correct_word = session.current_word["word"]
        if guess.strip().casefold() == correct_word.casefold():
            gained = session.lives
            session.score += gained
            session.correct += 1
            session.result = {"status": "correct", "answer": correct_word,
                              "points_awarded": gained,
                              "message": f"Correct! +{gained} points."}
        else:
            session.lives -= 1
            if session.lives == 0:
                session.result = {"status": "missed", "answer": correct_word,
                                  "points_awarded": 0,
                                  "message": f"Out of attempts. The word was {correct_word}."}
            else:
                session.result = None
        return session.public_state(session_id)


def next_word(session_id: str) -> dict:
    with _lock:
        session = _get(session_id)
        if session.completed:
            raise ValueError("The game is already complete.")
        if session.result is None:
            raise ValueError("Finish the current word before continuing.")
        session.index += 1
        session.lives = 3
        session.result = None
        return session.public_state(session_id)


def pronounce(session_id: str) -> str:
    with _lock:
        session = _get(session_id)
        if session.completed:
            raise ValueError("The game is complete.")
        return session.current_word["word"]


def end(session_id: str) -> None:
    with _lock:
        _sessions.pop(session_id, None)
