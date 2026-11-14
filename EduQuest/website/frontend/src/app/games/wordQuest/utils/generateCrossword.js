/** Build a connected crossword from the existing EduQuest word bank.
 * All words after the first must intersect a word already on the board.
 * Uses candidate words from the entire difficulty pool rather than throwing
 * away a clue when one randomly chosen word does not fit.
 */
const SETTINGS = {
  easy:    { range: [0, 89],   target: 5 },
  medium:  { range: [90, 182], target: 8 },
  hard:    { range: [183, 237],target: 10 },
  extreme: { range: [238, 277],target: 10 },
};

const shuffle = (items) => {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

function findPlacement(board, directions, answer, direction, row, col, requireCrossing) {
  const directionBit = direction === 'horizontal' ? 1 : 2;
  const n = board.length;
  const dr = direction === 'vertical' ? 1 : 0;
  const dc = direction === 'horizontal' ? 1 : 0;
  const beforeRow = row - dr, beforeCol = col - dc;
  const afterRow = row + dr * answer.length, afterCol = col + dc * answer.length;
  const inside = (r, c) => r >= 0 && r < n && c >= 0 && c < n;

  if (!inside(row, col) || !inside(row + dr * (answer.length - 1), col + dc * (answer.length - 1))) return -1;
  if (inside(beforeRow, beforeCol) && board[beforeRow][beforeCol]) return -1;
  if (inside(afterRow, afterCol) && board[afterRow][afterCol]) return -1;

  let crosses = 0;
  for (let i = 0; i < answer.length; i++) {
    const r = row + dr * i, c = col + dc * i;
    const occupied = board[r][c];
    if (occupied) {
      if (occupied !== answer[i] || (directions[r][c] & directionBit)) return -1;
      crosses++;
    } else {
      // Non-crossing letters may not touch another word sideways.
      if (direction === 'horizontal') {
        if (inside(r - 1, c) && board[r - 1][c]) return -1;
        if (inside(r + 1, c) && board[r + 1][c]) return -1;
      } else {
        if (inside(r, c - 1) && board[r][c - 1]) return -1;
        if (inside(r, c + 1) && board[r][c + 1]) return -1;
      }
    }
  }
  return requireCrossing && crosses === 0 ? -1 : crosses;
}

function optionsFor(board, directions, word, placed) {
  const answer = word.answer;
  const n = board.length;
  const options = [];
  if (!placed.length) {
    const row = Math.floor(n / 2);
    const col = Math.floor((n - answer.length) / 2);
    if (findPlacement(board, directions, answer, 'horizontal', row, col, false) >= 0) {
      options.push({row, col, direction: 'horizontal', crosses: 0});
    }
    return options;
  }

  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (!board[r][c]) continue;
      for (let i = 0; i < answer.length; i++) {
        if (answer[i] !== board[r][c]) continue;
        for (const direction of ['horizontal', 'vertical']) {
          const row = direction === 'vertical' ? r - i : r;
          const col = direction === 'horizontal' ? c - i : c;
          const crosses = findPlacement(board, directions, answer, direction, row, col, true);
          if (crosses > 0) options.push({row, col, direction, crosses});
        }
      }
    }
  }
  return options;
}

function buildOne(words, gridSize, target) {
  const board = Array.from({length: gridSize}, () => Array(gridSize).fill(''));
  const directions = Array.from({length: gridSize}, () => Array(gridSize).fill(0));
  const placed = [];
  const used = new Set();
  for (let slot = 0; slot < target; slot++) {
    let choice = null;
    // Search the bank for a word that has a legal crossing; don't skip slots.
    for (const word of shuffle(words)) {
      if (used.has(word.answer)) continue;
      const options = optionsFor(board, directions, word, placed);
      for (const p of options) {
        // Favor intersecting letters and keeping the grid relatively centered.
        const midR = p.row + (p.direction === 'vertical' ? word.answer.length / 2 : 0);
        const midC = p.col + (p.direction === 'horizontal' ? word.answer.length / 2 : 0);
        const centerPenalty = (Math.abs(midR - gridSize / 2) + Math.abs(midC - gridSize / 2)) / gridSize;
        const score = p.crosses * 5 - centerPenalty + Math.random() * 2;
        if (!choice || score > choice.score) choice = {word, ...p, score};
      }
    }
    if (!choice) break;
    const {word, row, col, direction} = choice;
    const dr = direction === 'vertical' ? 1 : 0;
    const dc = direction === 'horizontal' ? 1 : 0;
    for (let i = 0; i < word.answer.length; i++) {
      board[row + dr * i][col + dc * i] = word.answer[i];
      directions[row + dr * i][col + dc * i] |= direction === 'horizontal' ? 1 : 2;
    }
    placed.push({hint: word.hint, answer: word.answer, startRow: row, startCol: col, direction, length: word.answer.length});
    used.add(word.answer);
  }
  return {board, placed};
}

export function generateCrossword(crosswordData, difficulty, gridSize) {
  const setting = SETTINGS[difficulty] || SETTINGS.easy;
  const [start, end] = setting.range;
  const seen = new Set();
  const words = crosswordData.slice(start, end + 1).map(item => ({
    hint: item.hint, answer: String(item.answer || '').toUpperCase().trim(),
  })).filter(item => {
    if (!/^[A-Z]+$/.test(item.answer) || item.answer.length > gridSize || seen.has(item.answer)) return false;
    seen.add(item.answer);
    return true;
  });

  let best = {board: [], placed: []};
  for (let attempt = 0; attempt < 12 && best.placed.length < setting.target; attempt++) {
    const result = buildOne(words, gridSize, setting.target);
    if (result.placed.length > best.placed.length) best = result;
  }

  // Standard numbering: sort start squares in reading order; same start
  // square receives the same number for both across and down words.
  const startNumbers = new Map();
  let nextNumber = 1;
  const hints = [...best.placed].sort((a,b) => a.startRow - b.startRow || a.startCol - b.startCol);
  for (const hint of hints) {
    const key = `${hint.startRow},${hint.startCol}`;
    if (!startNumbers.has(key)) startNumbers.set(key, nextNumber++);
    hint.number = startNumbers.get(key);
  }

  return {
    hints,
    highlightGrid: best.board.map(row => row.map(Boolean)),
    blankGrid: best.board.map(row => row.map(() => '')),
  };
}
