export const ROWS = 20;
export const COLS = 10;
export const CELL_SIZE = 30;
export const INITIAL_SPEED_MS = 1000;
export const SPEED_DECREMENT_MS = 50;
export const LINES_PER_LEVEL = 10;
export const SCORE_SINGLE = 100;
export const SCORE_DOUBLE = 300;
export const SCORE_TRIPLE = 500;
export const SCORE_TETRIS = 800;
export const SCORE_HARD_DROP_PER_ROW = 2;
export const SCORE_SOFT_DROP_PER_ROW = 1;

// Tetromino shapes (I, J, L, O, S, T, Z)
export const TETROMINOS = {
  'I': {
    shape: [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0]
    ],
    color: '#00FFFF', // Cyan
    name: 'I'
  },
  'J': {
    shape: [
      [1, 0, 0],
      [1, 1, 1],
      [0, 0, 0]
    ],
    color: '#0000FF', // Blue
    name: 'J'
  },
  'L': {
    shape: [
      [0, 0, 1],
      [1, 1, 1],
      [0, 0, 0]
    ],
    color: '#FFA500', // Orange
    name: 'L'
  },
  'O': {
    shape: [
      [1, 1],
      [1, 1]
    ],
    color: '#FFFF00', // Yellow
    name: 'O'
  },
  'S': {
    shape: [
      [0, 1, 1],
      [1, 1, 0],
      [0, 0, 0]
    ],
    color: '#00FF00', // Green
    name: 'S'
  },
  'T': {
    shape: [
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0]
    ],
    color: '#800080', // Purple
    name: 'T'
  },
  'Z': {
    shape: [
      [1, 1, 0],
      [0, 1, 1],
      [0, 0, 0]
    ],
    color: '#FF0000', // Red
    name: 'Z'
  },
  'GHOST': {
    color: 'rgba(255, 255, 255, 0.3)'
  }
};

export const PIECE_KEYS = Object.keys(TETROMINOS).filter(k => k !== 'GHOST');

export const EMPTY_CELL = 0;

