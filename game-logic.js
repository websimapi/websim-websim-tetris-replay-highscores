import { ROWS, COLS, TETROMINOS, PIECE_KEYS, EMPTY_CELL, SCORE_SINGLE, SCORE_DOUBLE, SCORE_TRIPLE, SCORE_TETRIS, LINES_PER_LEVEL, INITIAL_SPEED_MS, SPEED_DECREMENT_MS, SCORE_HARD_DROP_PER_ROW, SCORE_SOFT_DROP_PER_ROW } from 'game-constants';

/**
 * Initializes a new empty game board.
 * @returns {Array<Array<number>>} The board state.
 */
export const createBoard = () => Array.from({ length: ROWS }, () => Array(COLS).fill(EMPTY_CELL));

/**
 * Creates a new random tetromino piece.
 * @returns {{shape: Array<Array<number>>, color: string, name: string, pos: {x: number, y: number}}} The new piece object.
 */
export const randomPiece = () => {
  const pieceName = PIECE_KEYS[Math.floor(Math.random() * PIECE_KEYS.length)];
  const piece = TETROMINOS[pieceName];
  
  // Center the piece horizontally
  const startX = Math.floor(COLS / 2) - Math.ceil(piece.shape[0].length / 2);

  return {
    ...piece,
    pos: { x: startX, y: 0 }
  };
};

/**
 * Checks if the current piece position and rotation is valid on the board.
 * @param {Object} piece - The piece object.
 * @param {Array<Array<number>>} board - The current board state.
 * @param {{x: number, y: number}} newPos - The proposed new position.
 * @param {Array<Array<number>>} [shape=piece.shape] - The proposed shape/rotation.
 * @returns {boolean} True if the move is valid, false otherwise.
 */
export const checkCollision = (piece, board, newPos, shape = piece.shape) => {
  for (let y = 0; y < shape.length; y++) {
    for (let x = 0; x < shape[y].length; x++) {
      // Check if we are checking an active block part of the piece
      if (shape[y][x] !== EMPTY_CELL) {
        const boardY = y + newPos.y;
        const boardX = x + newPos.x;

        // Check bounds (bottom and side walls)
        if (boardY >= ROWS || boardX < 0 || boardX >= COLS) {
          return true; // Collision with boundary
        }
        
        // Check for collision with existing blocks on the board
        // Note: boardY < 0 means the piece is still above the visible area, so no collision check needed yet.
        if (boardY >= 0 && board[boardY][boardX] !== EMPTY_CELL) {
          return true; // Collision with another block
        }
      }
    }
  }
  return false;
};

/**
 * Rotates a 2D matrix (tetromino shape) 90 degrees clockwise.
 * @param {Array<Array<number>>} matrix - The shape matrix.
 * @returns {Array<Array<number>>} The rotated matrix.
 */
export const rotate = (matrix) => {
  // Transpose the matrix
  const transposed = matrix[0].map((col, i) => matrix.map(row => row[i]));
  // Reverse each row (90 degrees clockwise rotation)
  return transposed.map(row => row.reverse());
};

/**
 * Clears completed lines and calculates score.
 * @param {Array<Array<number>>} board - The current board state.
 * @param {number} currentScore - The current score.
 * @param {number} linesCleared - The current total lines cleared.
 * @param {number} level - The current level.
 * @returns {{newBoard: Array<Array<number>>, newScore: number, newLines: number, newLevel: number, linesRemoved: number}}
 */
export const clearLines = (board, currentScore, linesCleared, level) => {
  let linesRemoved = 0;
  const newBoard = board.filter(row => {
    if (row.every(cell => cell !== EMPTY_CELL)) {
      linesRemoved++;
      return false;
    }
    return true;
  });

  // Add new empty rows to the top
  while (newBoard.length < ROWS) {
    newBoard.unshift(Array(COLS).fill(EMPTY_CELL));
  }

  let scoreIncrease = 0;
  switch (linesRemoved) {
    case 1: scoreIncrease = SCORE_SINGLE; break;
    case 2: scoreIncrease = SCORE_DOUBLE; break;
    case 3: scoreIncrease = SCORE_TRIPLE; break;
    case 4: scoreIncrease = SCORE_TETRIS; break;
  }
  
  // Scoring formula: Score = Base_Score * Level_Multiplier (1 + level/10)
  const scoreMultiplier = 1 + (level / 10);
  const newScore = currentScore + Math.floor(scoreIncrease * scoreMultiplier);
  const newLines = linesCleared + linesRemoved;
  const newLevel = Math.floor(newLines / LINES_PER_LEVEL) + 1;

  return { newBoard, newScore, newLines, newLevel, linesRemoved };
};

/**
 * Locks the current piece into the board.
 * @param {Array<Array<number>>} board - The current board state.
 * @param {Object} piece - The current piece.
 * @returns {Array<Array<number>>} The board with the piece locked in.
 */
export const lockPiece = (board, piece) => {
  const newBoard = board.map(row => [...row]); // Deep copy
  piece.shape.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== EMPTY_CELL) {
        const boardY = y + piece.pos.y;
        const boardX = x + piece.pos.x;
        if (boardY >= 0 && boardY < ROWS && boardX >= 0 && boardX < COLS) {
          // Store the piece's color ID or name in the board cell
          // We use the piece name (string) here for simpler rendering
          newBoard[boardY][boardX] = piece.name; 
        }
      }
    });
  });
  return newBoard;
};

/**
 * Calculates the drop position of the ghost piece.
 * @param {Object} piece - The current piece.
 * @param {Array<Array<number>>} board - The current board state.
 * @returns {number} The y coordinate of the ghost piece.
 */
export const calculateGhostY = (piece, board) => {
  let dropY = piece.pos.y;
  
  while (!checkCollision(piece, board, { x: piece.pos.x, y: dropY + 1 })) {
    dropY++;
  }
  return dropY;
};

/**
 * Calculates the game speed based on the current level.
 * @param {number} level - The current game level.
 * @returns {number} The interval speed in milliseconds.
 */
export const calculateSpeed = (level) => {
  // Speed decreases exponentially/linearly per level
  // Starts at 1000ms, decreases by 50ms per level up to level 10 (500ms min)
  const speed = INITIAL_SPEED_MS - (level - 1) * SPEED_DECREMENT_MS;
  return Math.max(100, speed); // Minimum 100ms interval
};

/**
 * Adds drop score to the current score
 * @param {number} currentScore - The current score.
 * @param {number} rowsDropped - The number of rows dropped.
 * @param {boolean} isHardDrop - Whether it was a hard drop.
 * @returns {number} The new score.
 */
export const addDropScore = (currentScore, rowsDropped, isHardDrop) => {
    const scorePerLine = isHardDrop ? SCORE_HARD_DROP_PER_ROW : SCORE_SOFT_DROP_PER_ROW;
    return currentScore + (rowsDropped * scorePerLine);
}

