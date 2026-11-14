/** Pure crossword rules; kept separate from React for regression testing.
 * A solved crossing belongs to EVERY word that uses that square.
 */
export function cellsForHint(hint) {
  return Array.from({ length: hint.length }, (_, i) => ({
    row: hint.startRow + (hint.direction === 'vertical' ? i : 0),
    col: hint.startCol + (hint.direction === 'horizontal' ? i : 0),
  }));
}

export function hintsAtCell(hints, row, col) {
  return hints.flatMap((hint, index) =>
    cellsForHint(hint).some(cell => cell.row === row && cell.col === col) ? [index] : []
  );
}

export function correctMask(hints, solvedWords, size) {
  const mask = Array.from({ length: size }, () => Array(size).fill(false));
  for (const index of solvedWords) {
    if (hints[index]) for (const { row, col } of cellsForHint(hints[index])) mask[row][col] = true;
  }
  return mask;
}

export function reconcileAnswers(grid, hints, previouslySolved) {
  const solved = new Set(previouslySolved);
  const newlySolved = [];
  hints.forEach((hint, index) => {
    if (solved.has(index)) return;
    const guess = cellsForHint(hint).map(({ row, col }) => grid[row][col]).join('');
    if (guess === hint.answer.toUpperCase()) {
      solved.add(index);
      newlySolved.push(index);
    }
  });
  return { solved, newlySolved, completed: hints.length > 0 && solved.size === hints.length };
}

export function nextEditableCell(hint, row, col, step, lockedMask) {
  const cells = cellsForHint(hint);
  const current = cells.findIndex(cell => cell.row === row && cell.col === col);
  if (current < 0) return null;
  for (let index = current + step; index >= 0 && index < cells.length; index += step) {
    const cell = cells[index];
    if (!lockedMask[cell.row][cell.col]) return cell;
  }
  return null;
}

export function firstEditableCell(hint, lockedMask, grid) {
  const cells = cellsForHint(hint);
  return cells.find(cell => !lockedMask[cell.row][cell.col] && !grid[cell.row][cell.col])
    || cells.find(cell => !lockedMask[cell.row][cell.col]) || null;
}
