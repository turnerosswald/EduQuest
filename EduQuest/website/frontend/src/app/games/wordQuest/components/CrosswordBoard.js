'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { crosswordData } from '../data/crosswordData';
import { generateCrossword } from '../utils/generateCrossword';
import { cellsForHint, hintsAtCell, correctMask, reconcileAnswers, nextEditableCell, firstEditableCell } from '../utils/crosswordLogic.mjs';
import { usePoints } from './PointsContext';
import { speak, stopSpeech } from '@/utils/tts';
import './styles.css';

const DIFFICULTIES = {
  easy: { gridSize: 10, cellSize: 40, points: 5, penalty: 1, font: '20px' },
  medium: { gridSize: 15, cellSize: 35, points: 7.5, penalty: 3, font: '18px' },
  hard: { gridSize: 20, cellSize: 30, points: 10, penalty: 5, font: '16px' },
  extreme: { gridSize: 25, cellSize: 25, points: 15, penalty: 10, font: '14px' },
};
const emptyMatrix = size => Array.from({ length: size }, () => Array(size).fill(''));

export default function CrosswordBoard({ difficulty }) {
  const setting = DIFFICULTIES[difficulty] || DIFFICULTIES.easy;
  const { gridSize, cellSize } = setting;
  const [grid, setGrid] = useState(() => emptyMatrix(gridSize));
  const [highlightGrid, setHighlightGrid] = useState(() => emptyMatrix(gridSize));
  const [hints, setHints] = useState([]);
  const [solvedWords, setSolvedWords] = useState(() => new Set());
  const [activeHint, setActiveHint] = useState(0);
  const [revealedHints, setRevealedHints] = useState({});
  const [feedback, setFeedback] = useState('');
  const [completed, setCompleted] = useState(false);
  const { points, setPoints } = usePoints();

  const solvedCells = correctMask(hints, solvedWords, gridSize);

  useEffect(() => {
    const puzzle = generateCrossword(crosswordData, difficulty, gridSize);
    setGrid(puzzle.blankGrid);
    setHighlightGrid(puzzle.highlightGrid);
    setHints(puzzle.hints);
    setSolvedWords(new Set());
    setRevealedHints({});
    setActiveHint(0);
    setFeedback('');
    setCompleted(false);
  }, [difficulty, gridSize]);
  useEffect(() => () => stopSpeech(), []);

  const focusCell = useCallback((row, col) => {
    // The DOM remains stable even after the crossword state is updated.
    if (typeof document === 'undefined') return;
    const target = document.querySelector(`.crossword-board input[data-row="${row}"][data-col="${col}"]`);
    if (target && !target.disabled) {
      target.focus();
      if (!target.readOnly) target.select();
    }
  }, []);

  const chooseHint = (index, shouldFocus = true) => {
    if (solvedWords.has(index) || !hints[index]) return;
    setActiveHint(index);
    if (shouldFocus) {
      const cell = firstEditableCell(hints[index], solvedCells, grid);
      if (cell) focusCell(cell.row, cell.col);
    }
  };

  const chooseCellHint = (row, col) => {
    const candidates = hintsAtCell(hints, row, col).filter(i => !solvedWords.has(i));
    if (!candidates.length) return;
    // Clicking a crossing again switches its writing direction.
    const next = candidates.length > 1 && candidates.includes(activeHint)
      ? candidates[(candidates.indexOf(activeHint) + 1) % candidates.length]
      : candidates.includes(activeHint) ? activeHint : candidates[0];
    setActiveHint(next);
  };

  const playSound = path => {
    if (typeof window !== 'undefined') new Audio(path).play().catch(() => {});
  };

  const focusNextWord = (fromIndex, solved, mask, newGrid) => {
    for (let step = 1; step <= hints.length; step++) {
      const index = (fromIndex + step) % hints.length;
      if (solved.has(index)) continue;
      const first = firstEditableCell(hints[index], mask, newGrid);
      if (first) {
        setActiveHint(index);
        // Wait until React commits readOnly states before focusing.
        requestAnimationFrame(() => focusCell(first.row, first.col));
        return;
      }
    }
  };

  const handleInputChange = (row, col, value) => {
    if (solvedCells[row][col] || !highlightGrid[row][col]) return;
    const letter = value.slice(-1).toUpperCase();
    if (!/^[A-Z]$/.test(letter)) return;
    const nextGrid = grid.map(line => [...line]);
    nextGrid[row][col] = letter;
    const { solved, newlySolved, completed: finished } = reconcileAnswers(nextGrid, hints, solvedWords);
    setGrid(nextGrid);
    if (newlySolved.length) {
      const mask = correctMask(hints, solved, gridSize);
      setSolvedWords(solved);
      setPoints(value => value + newlySolved.length * setting.points);
      setFeedback(newlySolved.length === 1 ? 'Correct! Word completed.' : `${newlySolved.length} words completed!`);
      playSound('/audio/correct.mp3');
      if (finished) setCompleted(true);
      else focusNextWord(newlySolved[newlySolved.length - 1], solved, mask, nextGrid);
      return;
    }

    const hintIndex = hintsAtCell(hints, row, col).includes(activeHint)
      ? activeHint
      : hintsAtCell(hints, row, col).find(index => !solvedWords.has(index));
    const hint = hints[hintIndex];
    if (!hint) return;
    if (hintIndex !== activeHint) setActiveHint(hintIndex);
    const positions = cellsForHint(hint);
    const wordFilled = positions.every(cell => nextGrid[cell.row][cell.col]);
    if (wordFilled) {
      // Keep the crossing letters so the player can FIX their attempt;
      // clearing the whole word also erases answers shared with other clues.
      setFeedback('Not quite. Change any incorrect letters and try again.');
      playSound('/audio/wrong.mp3');
    } else {
      setFeedback('');
    }
    const nextCell = nextEditableCell(hint, row, col, 1, solvedCells);
    if (nextCell) focusCell(nextCell.row, nextCell.col);
  };

  const handleKeyDown = (event, row, col) => {
    if (event.key === 'Backspace') {
      if (!solvedCells[row][col] && grid[row][col]) {
        event.preventDefault();
        const newGrid = grid.map(line => [...line]);
        newGrid[row][col] = '';
        setGrid(newGrid);
        setFeedback('');
        return;
      }
      const hint = hints[activeHint];
      if (hint) {
        event.preventDefault();
        const previous = nextEditableCell(hint, row, col, -1, solvedCells);
        if (previous) {
          const newGrid = grid.map(line => [...line]);
          newGrid[previous.row][previous.col] = '';
          setGrid(newGrid);
          setFeedback('');
          focusCell(previous.row, previous.col);
        }
      }
    } else if (['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(event.key)) {
      event.preventDefault();
      const vertical = event.key === 'ArrowDown' || event.key === 'ArrowUp';
      const indices = hintsAtCell(hints, row, col).filter(i => !solvedWords.has(i));
      const byDirection = indices.find(i => hints[i].direction === (vertical ? 'vertical' : 'horizontal'));
      if (byDirection !== undefined) {
        setActiveHint(byDirection);
        const cell = nextEditableCell(hints[byDirection], row, col,
          event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1, solvedCells);
        if (cell) focusCell(cell.row, cell.col);
      }
    } else if (event.key === 'Enter') {
      event.preventDefault();
      focusNextWord(activeHint, solvedWords, solvedCells, grid);
    }
  };

  const revealHint = index => {
    if (revealedHints[index] || solvedWords.has(index)) return;
    setRevealedHints(prev => ({ ...prev, [index]: true }));
    setPoints(prev => prev - setting.penalty);
  };

  return (
    <div className="wordquest-game">
      {completed && <p className="wordquest__completion" role="status">Nice job! You&apos;ve completed the crossword!</p>}
      <div className="wordquest__scoreline">
        <h2>Difficulty: {difficulty.toUpperCase()}</h2>
        <h3>Points: {points}</h3>
      </div>
      {feedback && <p className="wordquest__feedback" role="status">{feedback}</p>}
      <div className="wordquest-play-layout">
        <div className="wordquest-grid-scroll">
          <div className="crossword-board" style={{
            gridTemplateColumns: `repeat(${gridSize}, ${cellSize}px)`,
            gridTemplateRows: `repeat(${gridSize}, ${cellSize}px)`,
            width: `${gridSize * cellSize + 8}px`,
            border: '4px solid #2c3e50',
            borderRadius: 0,
            boxShadow: '0 4px 8px rgba(0,0,0,.7)',
          }}>
            {grid.map((line, row) => line.map((letter, col) => {
              const options = hintsAtCell(hints, row, col);
              const number = hints.find(h => h.startRow === row && h.startCol === col)?.number;
              const used = highlightGrid[row]?.[col];
              const locked = solvedCells[row]?.[col];
              const selected = options.includes(activeHint) && !solvedWords.has(activeHint);
              return <div key={`${row}-${col}`} style={{ position: 'relative', width: cellSize, height: cellSize }}>
                {number != null && <span className="wordquest__clue-number">{number}</span>}
                <input
                  className={`cell${selected ? ' cell--active' : ''}${locked ? ' cell--solved' : ''}`}
                  type="text" inputMode="text" maxLength={1}
                  aria-label={`Row ${row + 1}, column ${col + 1}${number != null ? `, clue ${number}` : ''}`}
                  value={used ? letter : ''}
                  onChange={event => handleInputChange(row, col, event.target.value)}
                  onKeyDown={event => handleKeyDown(event, row, col)}
                  onClick={() => chooseCellHint(row, col)}
                  onFocus={event => event.target.select()}
                  disabled={!used} readOnly={locked}
                  data-row={row} data-col={col}
                  style={{ width: '100%', height: '100%', fontSize: setting.font }}
                />
              </div>;
            }))}
          </div>
        </div>
        <div className="hints-container">
          <div className="hint-instructions">
            <p>Click a clue to select its word. Click a crossing again to change direction.</p>
            <p>Use Play to hear the clue. Reveal costs points.</p>
          </div>
          <div className="hints-box">
            {hints.map((hint, index) => (
              <div key={`${hint.number}-${hint.direction}`} className={`wordquest__hint-row${activeHint === index ? ' wordquest__hint-row--active' : ''}${solvedWords.has(index) ? ' wordquest__hint-row--solved' : ''}`}>
                <button type="button" className="wordquest__hint-select" onClick={() => chooseHint(index)} aria-pressed={activeHint === index}>
                  <strong>{hint.number}. </strong>{revealedHints[index] ? hint.answer : hint.hint}
                  <small>({hint.direction === 'horizontal' ? 'Across' : 'Down'})</small>
                </button>
                <div className="wordquest__hint-actions">
                  <button type="button" onClick={() => speak(hint.hint).catch(() => {})}>Play</button>
                  {!revealedHints[index] && !solvedWords.has(index) &&
                    <button type="button" onClick={() => revealHint(index)}>Reveal</button>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
