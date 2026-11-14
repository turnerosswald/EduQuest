'use client';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import '../style/SpellingGame.css';

const LEVELS = ['Easy', 'Medium', 'Hard', 'Final'];
// The original Pygame soundtrack is bundled under public/assets/sounds.
// Use browser playback for feedback; scoring/progression still happens in Python.
const SFX = {
  first: '/assets/sounds/answer%20audios/first_ans.mp3',
  second: '/assets/sounds/answer%20audios/second_ans.mp3',
  third: '/assets/sounds/answer%20audios/third_ans.mp3',
  final: '/assets/sounds/answer%20audios/final_ans.mp3',
  newLevel: '/assets/sounds/new%20level%20sound.mp3',
  ending: '/assets/sounds/end%20of%20game.mp3',
  wrong: '/audio/wrong.mp3',
};
// All game calls go through the Next.js same-origin proxy; no browser localhost URL.

async function spellingHealth() {
  try {
    const response = await fetch('/api/spelling_bee/health', { cache: 'no-store' });
    return response.ok;
  } catch { return false; }
}

async function request(endpoint, payload) {
  let response;
  try {
    response = await fetch(`/api/spelling_bee/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error('Cannot connect to the EduQuest website API. Check that Next.js is running.');
  }
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.detail || `Game server returned ${response.status}.`);
  return body;
}

export default function SpellingGame() {
  const [selectedLevel, setSelectedLevel] = useState('Easy');
  const [game, setGame] = useState(null);
  const [guess, setGuess] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const [serverStatus, setServerStatus] = useState('checking');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const soundRef = useRef(null);

  const playFeedbackSound = useCallback((path) => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      soundRef.current?.pause();
      const audio = new Audio(path);
      audio.volume = 0.85;
      soundRef.current = audio;
      audio.play().catch((reason) => console.warn('Sound playback was blocked:', reason));
    } catch (reason) {
      console.warn('Sound playback unavailable:', reason);
    }
  }, [soundEnabled]);

  useEffect(() => () => {
    soundRef.current?.pause();
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  }, []);

  useEffect(() => {
    let active = true;
    spellingHealth().then(ok => { if (active) setServerStatus(ok ? 'online' : 'offline'); });
    return () => { active = false; };
  }, []);

  const retryConnection = async () => {
    setServerStatus('checking');
    const ok = await spellingHealth();
    setServerStatus(ok ? 'online' : 'offline');
    if (ok) setError('');
  };

  const act = useCallback(async (task) => {
    setLoading(true);
    setError('');
    try {
      await task();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }, []);

  const startGame = (level) => act(async () => {
    const state = await request('start', { level });
    setSelectedLevel(level);
    setGame(state);
    setServerStatus('online');
    setGuess('');
    setNotice('Click Hear Word to listen to the spelling challenge.');
  });

  const playWord = () => act(async () => {
    if (!game || game.completed) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      throw new Error('Your browser does not support speech synthesis. Try a current version of Chrome, Edge or Safari.');
    }
    const { word } = await request('pronounce', { session_id: game.session_id });
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'en-US';
    utterance.rate = 0.85;
    window.speechSynthesis.speak(utterance);
  });

  const submit = (event) => {
    event.preventDefault();
    if (!game || game.result || !guess.trim() || loading) return;
    act(async () => {
      const state = await request('answer', { session_id: game.session_id, guess });
      setGame(state);
      setGuess('');
      if (state.result) setNotice(state.result.message);
      else setNotice('Not quite — try again! Use the hint, then listen once more.');
      if (state.result?.status === 'correct') {
        const sound = state.round_number === state.round_total ? SFX.final
          : state.result.points_awarded === 3 ? SFX.first
          : state.result.points_awarded === 2 ? SFX.second : SFX.third;
        playFeedbackSound(sound);
      } else {
        playFeedbackSound(SFX.wrong);
      }
    });
  };

  const nextWord = useCallback(() => {
    if (!game || !game.result || loading) return;
    return act(async () => {
      const state = await request('next', { session_id: game.session_id });
      setGame(state);
      setGuess('');
      setNotice(state.completed ? 'Great job! You completed this level.' : 'New word! Press Hear Word to listen.');
      if (state.completed) playFeedbackSound(selectedLevel === 'Final' ? SFX.ending : SFX.newLevel);
    });
  }, [act, game, loading, playFeedbackSound, selectedLevel]);

  // When feedback is shown, Enter activates the same Next Word action as the button.
  // This listens on window because the input form is unmounted after each answer.
  useEffect(() => {
    if (!game?.result || game.completed) return;
    const onKeyDown = (event) => {
      if (event.key !== 'Enter' || event.repeat || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (event.target?.tagName === 'TEXTAREA') return;
      event.preventDefault();
      if (!loading) nextWord();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [game?.result, game?.completed, loading, nextWord]);

  const backToLevels = () => act(async () => {
    if (game) await request('end', { session_id: game.session_id });
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
    setGame(null);
    setNotice('');
  });

  const finishedLevelIndex = LEVELS.indexOf(selectedLevel);
  const nextLevel = finishedLevelIndex < LEVELS.length - 1 ? LEVELS[finishedLevelIndex + 1] : null;
  const levelClass = selectedLevel.toLowerCase();
  return (
    <main className={`spelling-v2 spelling-v2--${levelClass}`}>
      <section className="spelling-v2__panel" aria-label="Moski's Spelling Adventure">
        <header className="spelling-v2__header">
          <div>
            <p className="spelling-v2__eyebrow">EduQuest · Word Game</p>
            <h1>Moski&apos;s Spelling Adventure</h1>
          </div>
          <div className="spelling-v2__header-actions">
            <button type="button" className="spelling-v2__quiet" aria-pressed={soundEnabled}
              onClick={() => setSoundEnabled(value => !value)}>
              {soundEnabled ? '🔊 Sound On' : '🔇 Sound Off'}
            </button>
            <button type="button" className="spelling-v2__quiet" onClick={() => setShowHelp(!showHelp)}>
              {showHelp ? 'Close Help' : 'How to Play'}
            </button>
          </div>
        </header>
        {showHelp && (
          <aside className="spelling-v2__help">
            Choose a difficulty and listen to each word. Type the spelling, then press Check Answer.
            You get three attempts per word and earn one point for each life remaining when you spell it correctly.
            After a wrong guess you&apos;ll see a hint. Finish 15 words to complete a level.
            Press Enter to check your answer, and Enter again to go to the next word after feedback.
          </aside>
        )}
        {!game && (
          <div className="spelling-v2__intro">
            <h2>Select your level</h2>
            <p>Listen carefully, spell each word, and make your way through the adventure.</p>
            <div className="spelling-v2__connection" role="status">
              <span className={`spelling-v2__signal spelling-v2__signal--${serverStatus}`} aria-hidden="true" />
              <span>{serverStatus === 'online' ? 'Spelling server connected' : serverStatus === 'checking' ? 'Checking spelling server...' : 'Spelling server offline — start the Python backend in a second terminal.'}</span>
              {serverStatus === 'offline' && <button type="button" onClick={retryConnection}>Retry Connection</button>}
            </div>
            <div className="spelling-v2__levels">
              {LEVELS.map(level => (
                <button key={level} disabled={loading} onClick={() => startGame(level)}>{level}</button>
              ))}
            </div>
          </div>
        )}
        {game && !game.completed && (
          <div className="spelling-v2__play">
            <div className="spelling-v2__stats" aria-label="Game progress">
              <span>Level: <b>{game.level}</b></span>
              <span>Word <b>{game.round_number}/{game.round_total}</b></span>
              <span>Lives <b>{'♥'.repeat(game.lives)}{'♡'.repeat(3 - game.lives)}</b></span>
              <span>Points <b>{game.score}</b></span>
            </div>
            <p className="spelling-v2__prompt">{game.prompt}</p>
            <button className="spelling-v2__hear" type="button" disabled={loading} onClick={playWord}>🔊 Hear Word</button>
            {game.hint && <p className="spelling-v2__hint">Hint: {game.hint}</p>}
            {game.result ? (
              <div className="spelling-v2__feedback" role="status">
                <p>{game.result.message}</p>
                <button type="button" disabled={loading} onClick={nextWord}>Next Word → (Enter ↵)</button>
              </div>
            ) : (
              <form onSubmit={submit} className="spelling-v2__form">
                <label htmlFor="spell-answer">Spell the word you hear</label>
                <input id="spell-answer" autoComplete="off" spellCheck="false" maxLength={128}
                  value={guess} onChange={event => setGuess(event.target.value)}
                  placeholder="Type your answer" aria-describedby="spelling-game-notice" />
                <button disabled={loading || !guess.trim()} type="submit">Check Answer</button>
              </form>
            )}
            <button className="spelling-v2__quiet" disabled={loading} onClick={backToLevels}>Change level</button>
          </div>
        )}
        {game && game.completed && (
          <div className="spelling-v2__finish" role="status">
            <h2>Level complete! 🎉</h2>
            <p>You spelled {game.correct} out of {game.round_total} words correctly.</p>
            <p className="spelling-v2__final-score">Final score: {game.score} / {game.round_total * 3}</p>
            <button disabled={loading} onClick={() => startGame(selectedLevel)}>Play Again</button>
            {nextLevel && <button disabled={loading} onClick={() => startGame(nextLevel)}>Next Level: {nextLevel}</button>}
            <button disabled={loading} onClick={backToLevels} className="spelling-v2__quiet">Select another level</button>
          </div>
        )}
        {notice && game && !game.result && !game.completed && <p id="spelling-game-notice" className="spelling-v2__notice" role="status">{notice}</p>}
        {error && <p className="spelling-v2__error" role="alert">{error}</p>}
      </section>
      {/* Keep Moski outside the game panel so he has a consistent position and size. */}
      <img
        src="/assets/images/oski-trimmed.png"
        alt="Moski the spelling mascot"
        className="spelling-v2__character"
        width="596"
        height="804"
      />
    </main>
  );
}
