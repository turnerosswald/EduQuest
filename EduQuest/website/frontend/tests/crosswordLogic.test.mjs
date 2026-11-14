import test from 'node:test';
import assert from 'node:assert/strict';
import { cellsForHint, hintsAtCell, correctMask, reconcileAnswers, firstEditableCell, nextEditableCell } from '../src/app/games/wordQuest/utils/crosswordLogic.mjs';

const horizontal = { startRow: 1, startCol: 0, direction: 'horizontal', length: 4, answer: 'POND' };
const vertical = { startRow: 1, startCol: 3, direction: 'vertical', length: 4, answer: 'DASH' };
const hints = [horizontal, vertical];
const blank = () => Array.from({ length: 6 }, () => Array(6).fill(''));

test('correct answer locks only its word, preserves crossing for next word', () => {
  const grid = blank();
  'POND'.split('').forEach((char, index) => { grid[1][index] = char; });
  const first = reconcileAnswers(grid, hints, new Set());
  assert.deepEqual(first.newlySolved, [0]);
  assert.equal(first.completed, false);
  const mask = correctMask(hints, first.solved, 6);
  assert.equal(mask[1][3], true);
  assert.equal(mask[2][3], false);
  const next = firstEditableCell(vertical, mask, grid);
  assert.deepEqual(next, { row: 2, col: 3 });
  'ASH'.split('').forEach((char, index) => { grid[2 + index][3] = char; });
  const second = reconcileAnswers(grid, hints, first.solved);
  assert.deepEqual(second.newlySolved, [1]);
  assert.equal(second.completed, true);
  assert.equal(grid[1][3], 'D');
});

test('solved words do not award again after other words are entered', () => {
  const grid = blank();
  'POND'.split('').forEach((char, index) => { grid[1][index] = char; });
  const initial = reconcileAnswers(grid, hints, new Set());
  const repeat = reconcileAnswers(grid, hints, initial.solved);
  assert.deepEqual(repeat.newlySolved, []);
});

test('incorrect full answer stays editable and does not destroy crossing', () => {
  const grid = blank();
  'POND'.split('').forEach((char, index) => { grid[1][index] = char; });
  const first = reconcileAnswers(grid, hints, new Set());
  'XYZ'.split('').forEach((char, index) => { grid[2 + index][3] = char; });
  const second = reconcileAnswers(grid, hints, first.solved);
  assert.deepEqual(second.newlySolved, []);
  assert.equal(grid[1][3], 'D');
  assert.equal(grid[2][3], 'X');
});

test('crossings can be selected in either direction', () => {
  assert.deepEqual(hintsAtCell(hints, 1, 3), [0, 1]);
  assert.deepEqual(hintsAtCell(hints, 3, 3), [1]);
  assert.equal(cellsForHint(vertical).length, 4);
});

test('keyboard navigation skips solved intersection cells', () => {
  const mask = blank().map(row => row.map(() => false));
  mask[1][3] = true;
  assert.deepEqual(nextEditableCell(vertical, 2, 3, -1, mask), null);
  assert.deepEqual(nextEditableCell(vertical, 2, 3, +1, mask), {row: 3, col: 3});
});
