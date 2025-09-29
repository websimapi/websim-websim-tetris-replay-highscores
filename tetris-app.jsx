import { jsxDEV } from "react/jsx-dev-runtime";
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import * as GameLogic from "game-logic";
import { ROWS, COLS, TETROMINOS, EMPTY_CELL, PIECE_KEYS, INITIAL_SPEED_MS } from "game-constants";
import { HighScores, submitHighScore } from "high-scores";
import * as ReplayLogic from "replay-logic";
import WebsimSocket from "@websim-dev/websim-socket";
const room = new WebsimSocket();
const CELL_COLORS = {
  [EMPTY_CELL]: "transparent",
  ...Object.fromEntries(PIECE_KEYS.map((key) => [key, TETROMINOS[key].color]))
};
const NextPieceDisplay = React.memo(({ piece }) => {
  if (!piece) return null;
  const size = piece.shape.length;
  const paddingX = Math.floor((4 - size) / 2);
  const paddingY = Math.floor((4 - size) / 2);
  const gridCells = [];
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      let color = "transparent";
      const shapeX = x - paddingX;
      const shapeY = y - paddingY;
      if (shapeX >= 0 && shapeX < size && shapeY >= 0 && shapeY < size) {
        if (piece.shape[shapeY][shapeX] !== EMPTY_CELL) {
          color = piece.color;
        }
      }
      gridCells.push(
        /* @__PURE__ */ jsxDEV("div", { className: "cell", style: { backgroundColor: color } }, `${y}-${x}`, false, {
          fileName: "<stdin>",
          lineNumber: 39,
          columnNumber: 17
        })
      );
    }
  }
  return /* @__PURE__ */ jsxDEV("div", { className: "stats", children: [
    /* @__PURE__ */ jsxDEV("h2", { children: "Next Piece" }, void 0, false, {
      fileName: "<stdin>",
      lineNumber: 46,
      columnNumber: 13
    }),
    /* @__PURE__ */ jsxDEV("div", { className: "next-piece-display", children: gridCells }, void 0, false, {
      fileName: "<stdin>",
      lineNumber: 47,
      columnNumber: 13
    })
  ] }, void 0, true, {
    fileName: "<stdin>",
    lineNumber: 45,
    columnNumber: 9
  });
});
const TetrisBoard = ({ board, currentPiece, ghostY, isReplaying }) => {
  const combinedBoard = useMemo(() => {
    const newBoard = board.map((row) => [...row]);
    if (currentPiece && !isReplaying) {
      currentPiece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
          if (value !== EMPTY_CELL) {
            const boardY = y + ghostY;
            const boardX = x + currentPiece.pos.x;
            if (boardY >= 0 && boardY < ROWS && boardX >= 0 && boardX < COLS) {
              if (newBoard[boardY][boardX] === EMPTY_CELL) {
                newBoard[boardY][boardX] = "GHOST";
              }
            }
          }
        });
      });
    }
    if (currentPiece) {
      currentPiece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
          if (value !== EMPTY_CELL) {
            const boardY = y + currentPiece.pos.y;
            const boardX = x + currentPiece.pos.x;
            if (boardY >= 0 && boardY < ROWS && boardX >= 0 && boardX < COLS) {
              newBoard[boardY][boardX] = currentPiece.name;
            }
          }
        });
      });
    }
    return newBoard;
  }, [board, currentPiece, ghostY, isReplaying]);
  return /* @__PURE__ */ jsxDEV("div", { className: "game-board", children: combinedBoard.flat().map((cellValue, index) => {
    const color = cellValue === "GHOST" ? TETROMINOS.GHOST.color : CELL_COLORS[cellValue] || "transparent";
    return /* @__PURE__ */ jsxDEV(
      "div",
      {
        className: "cell",
        style: { backgroundColor: color }
      },
      index,
      false,
      {
        fileName: "<stdin>",
        lineNumber: 101,
        columnNumber: 21
      }
    );
  }) }, void 0, false, {
    fileName: "<stdin>",
    lineNumber: 97,
    columnNumber: 9
  });
};
const getInitialState = () => {
  const initialPiece = GameLogic.randomPiece();
  const nextPiece = GameLogic.randomPiece();
  return {
    board: GameLogic.createBoard(),
    currentPiece: initialPiece,
    nextPiece,
    score: 0,
    lines: 0,
    level: 1,
    isGameOver: false,
    isRunning: false,
    isReplaying: false,
    // Replay/History state
    pieceQueue: [initialPiece.name, nextPiece.name],
    replayActions: [],
    replayState: null
  };
};
const TetrisApp = () => {
  const [gameState, setGameState] = useState(getInitialState);
  const [softDropActive, setSoftDropActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const gameLoopRef = useRef();
  const lastTimeRef = useRef(0);
  const intervalRef = useRef(INITIAL_SPEED_MS);
  const replayTimerRef = useRef();
  const { board, currentPiece, nextPiece, score, lines, level, isGameOver, isRunning, isReplaying, pieceQueue, replayActions, replayState } = gameState;
  const gameSpeed = isReplaying ? 50 : GameLogic.calculateSpeed(level);
  const currentInterval = softDropActive ? Math.min(50, gameSpeed / 5) : gameSpeed;
  const updatePiece = useCallback((newPiece, action, data = {}) => {
    setGameState((prev) => {
      const recordAction = !prev.isReplaying && prev.isRunning;
      const newReplayActions = recordAction ? [...prev.replayActions, { time: performance.now() - prev.startTime, action, data }] : prev.replayActions;
      return {
        ...prev,
        currentPiece: newPiece,
        replayActions: newReplayActions
      };
    });
  }, []);
  const dropPiece = useCallback((dropScoreIncrease = 0) => {
    setGameState((prev) => {
      let newBoard = prev.board;
      let newScore = prev.score + dropScoreIncrease;
      let newLines = prev.lines;
      let newLevel = prev.level;
      newBoard = GameLogic.lockPiece(newBoard, prev.currentPiece);
      const lineResult = GameLogic.clearLines(newBoard, newScore, newLines, newLevel);
      newBoard = lineResult.newBoard;
      newScore = lineResult.newScore;
      newLines = lineResult.newLines;
      newLevel = lineResult.newLevel;
      let newCurrentPiece = null;
      let newNextPiece = prev.nextPiece;
      let newPieceQueue = prev.pieceQueue;
      if (prev.isReplaying) {
        const { pieceName, nextIndex } = ReplayLogic.getNextPieceInQueue(prev.replayState);
        if (pieceName) {
          newCurrentPiece = { ...TETROMINOS[pieceName], pos: { x: Math.floor(COLS / 2) - Math.ceil(TETROMINOS[pieceName].shape[0].length / 2), y: 0 } };
          prev.replayState.pieceIndex = nextIndex;
        } else {
          newCurrentPiece = null;
        }
        newNextPiece = null;
      } else {
        newCurrentPiece = newNextPiece;
        newNextPiece = GameLogic.randomPiece();
        newPieceQueue = [...prev.pieceQueue, newNextPiece.name];
      }
      const isGameOver2 = newCurrentPiece && GameLogic.checkCollision(newCurrentPiece, newBoard, newCurrentPiece.pos);
      if (isGameOver2 && !prev.isReplaying) {
        submitHighScore(newScore, newLevel, newLines, {
          pieceQueue: newPieceQueue,
          actions: prev.replayActions
        });
      }
      return {
        ...prev,
        board: newBoard,
        score: newScore,
        lines: newLines,
        level: newLevel,
        currentPiece: newCurrentPiece,
        nextPiece: newNextPiece,
        isGameOver: isGameOver2,
        isRunning: !isGameOver2 && prev.isRunning,
        pieceQueue: newPieceQueue
      };
    });
  }, []);
  const movePiece = useCallback((dx, dy, action) => {
    setGameState((prev) => {
      if (!prev.currentPiece || prev.isGameOver || prev.isPaused) return prev;
      const newPos = { x: prev.currentPiece.pos.x + dx, y: prev.currentPiece.pos.y + dy };
      if (!GameLogic.checkCollision(prev.currentPiece, prev.board, newPos)) {
        let dropScoreIncrease = 0;
        if (dy > 0) {
          dropScoreIncrease = GameLogic.SCORE_SOFT_DROP_PER_ROW;
        }
        const recordAction = !prev.isReplaying && prev.isRunning;
        const newReplayActions = recordAction ? [...prev.replayActions, { time: performance.now() - prev.startTime, action }] : prev.replayActions;
        return {
          ...prev,
          currentPiece: { ...prev.currentPiece, pos: newPos },
          score: prev.score + dropScoreIncrease,
          replayActions: newReplayActions
        };
      } else if (dy > 0) {
        dropPiece();
      }
      return prev;
    });
  }, [dropPiece]);
  const rotatePiece = useCallback(() => {
    setGameState((prev) => {
      if (!prev.currentPiece || prev.isGameOver || prev.isPaused) return prev;
      const rotatedShape = GameLogic.rotate(prev.currentPiece.shape);
      const rotatedPiece = { ...prev.currentPiece, shape: rotatedShape };
      const offsets = [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: -1, y: 0 },
        { x: 0, y: -1 },
        { x: 2, y: 0 },
        { x: -2, y: 0 }
      ];
      for (const offset of offsets) {
        const newPos = {
          x: prev.currentPiece.pos.x + offset.x,
          y: prev.currentPiece.pos.y + offset.y
        };
        if (!GameLogic.checkCollision(rotatedPiece, prev.board, newPos)) {
          const recordAction = !prev.isReplaying && prev.isRunning;
          const newReplayActions = recordAction ? [...prev.replayActions, { time: performance.now() - prev.startTime, action: "rotate" }] : prev.replayActions;
          return {
            ...prev,
            currentPiece: { ...rotatedPiece, pos: newPos },
            replayActions: newReplayActions
          };
        }
      }
      return prev;
    });
  }, []);
  const hardDrop = useCallback(() => {
    setGameState((prev) => {
      if (!prev.currentPiece || prev.isGameOver || prev.isPaused) return prev;
      const startY = prev.currentPiece.pos.y;
      const dropY = GameLogic.calculateGhostY(prev.currentPiece, prev.board);
      const rowsDropped = dropY - startY;
      if (rowsDropped > 0) {
        const newCurrentPiece = { ...prev.currentPiece, pos: { x: prev.currentPiece.pos.x, y: dropY } };
        const dropScoreIncrease = GameLogic.addDropScore(0, rowsDropped, true);
        const recordAction = !prev.isReplaying && prev.isRunning;
        const newReplayActions = recordAction ? [...prev.replayActions, { time: performance.now() - prev.startTime, action: "hardDrop" }] : prev.replayActions;
        const nextState = { ...prev, currentPiece: newCurrentPiece, replayActions: newReplayActions, score: prev.score + dropScoreIncrease };
        let newBoard = nextState.board;
        let newScore = nextState.score;
        let newLines = nextState.lines;
        let newLevel = nextState.level;
        newBoard = GameLogic.lockPiece(newBoard, newCurrentPiece);
        const lineResult = GameLogic.clearLines(newBoard, newScore, newLines, newLevel);
        newBoard = lineResult.newBoard;
        newScore = lineResult.newScore;
        newLines = lineResult.newLines;
        newLevel = lineResult.newLevel;
        let nextPieceToUse = null;
        let newNextPiece = nextState.nextPiece;
        let newPieceQueue = nextState.pieceQueue;
        if (nextState.isReplaying) {
          const { pieceName, nextIndex } = ReplayLogic.getNextPieceInQueue(nextState.replayState);
          if (pieceName) {
            nextPieceToUse = { ...TETROMINOS[pieceName], pos: { x: Math.floor(COLS / 2) - Math.ceil(TETROMINOS[pieceName].shape[0].length / 2), y: 0 } };
            nextState.replayState.pieceIndex = nextIndex;
          } else {
            nextPieceToUse = null;
          }
          newNextPiece = null;
        } else {
          nextPieceToUse = newNextPiece;
          newNextPiece = GameLogic.randomPiece();
          newPieceQueue = [...nextState.pieceQueue, newNextPiece.name];
        }
        const isGameOver2 = nextPieceToUse && GameLogic.checkCollision(nextPieceToUse, newBoard, nextPieceToUse.pos);
        if (isGameOver2 && !nextState.isReplaying) {
          submitHighScore(newScore, newLevel, newLines, {
            pieceQueue: newPieceQueue,
            actions: nextState.replayActions
          });
        }
        return {
          ...nextState,
          board: newBoard,
          score: newScore,
          lines: newLines,
          level: newLevel,
          currentPiece: nextPieceToUse,
          nextPiece: newNextPiece,
          isGameOver: isGameOver2,
          isRunning: !isGameOver2 && nextState.isRunning,
          pieceQueue: newPieceQueue
        };
      }
      dropPiece();
      return prev;
    });
  }, [dropPiece]);
  const startGame = useCallback((replayData = null) => {
    setGameState(() => {
      const freshState = getInitialState();
      if (replayData) {
        const replayState2 = ReplayLogic.initializeReplayState(replayData);
        let nextPieceName, currentPieceName;
        ({ pieceName: currentPieceName, nextIndex: replayState2.pieceIndex } = ReplayLogic.getNextPieceInQueue(replayState2));
        ({ pieceName: nextPieceName, nextIndex: replayState2.pieceIndex } = ReplayLogic.getNextPieceInQueue(replayState2));
        const currentPiece2 = { ...TETROMINOS[currentPieceName], pos: { x: Math.floor(COLS / 2) - Math.ceil(TETROMINOS[currentPieceName].shape[0].length / 2), y: 0 } };
        return {
          ...freshState,
          isReplaying: true,
          isRunning: true,
          isGameOver: false,
          isPaused: false,
          replayState: replayState2,
          currentPiece: currentPiece2,
          nextPiece: null,
          // Hide next piece in replay mode
          startTime: performance.now(),
          // pieceQueue and replayActions are irrelevant in replay mode setup, they are used *from* replayState
          pieceQueue: [],
          replayActions: []
        };
      }
      return {
        ...freshState,
        isRunning: true,
        isGameOver: false,
        isPaused: false,
        startTime: performance.now()
      };
    });
    setIsPaused(false);
    setSoftDropActive(false);
  }, []);
  const togglePause = useCallback(() => {
    if (isRunning && !isGameOver) {
      setIsPaused((p) => !p);
    }
  }, [isRunning, isGameOver]);
  const ghostY = useMemo(() => {
    if (!currentPiece) return -1;
    return GameLogic.calculateGhostY(currentPiece, board);
  }, [currentPiece, board]);
  useEffect(() => {
    if (!isRunning || isGameOver || isPaused) {
      clearInterval(gameLoopRef.current);
      return;
    }
    const tick = () => {
      if (intervalRef.current !== currentInterval) {
        clearInterval(gameLoopRef.current);
        intervalRef.current = currentInterval;
        gameLoopRef.current = setInterval(tick, currentInterval);
      }
      if (isReplaying) {
        handleReplayTick();
      } else {
        movePiece(0, 1, "softDrop");
      }
    };
    clearInterval(gameLoopRef.current);
    intervalRef.current = currentInterval;
    gameLoopRef.current = setInterval(tick, currentInterval);
    return () => clearInterval(gameLoopRef.current);
  }, [isRunning, isGameOver, isPaused, currentInterval, movePiece, isReplaying]);
  const handleReplayTick = () => {
    setGameState((prev) => {
      if (!prev.replayState) return prev;
      const currentTime = performance.now() - prev.startTime;
      let nextAction = ReplayLogic.getNextAction(prev.replayState)?.action;
      let updatedState = prev;
      let performedAction = false;
      while (nextAction && nextAction.time <= currentTime) {
        performedAction = true;
        prev.replayState.actionIndex++;
        if (nextAction.action === "softDrop") {
          const newPos = { x: updatedState.currentPiece.pos.x, y: updatedState.currentPiece.pos.y + 1 };
          if (!GameLogic.checkCollision(updatedState.currentPiece, updatedState.board, newPos)) {
            updatedState = { ...updatedState, currentPiece: { ...updatedState.currentPiece, pos: newPos } };
          } else {
            const { newBoard, newCurrentPiece, newNextPiece, isGameOver: isGameOver2 } = handleReplayLock(updatedState);
            updatedState = {
              ...updatedState,
              board: newBoard,
              currentPiece: newCurrentPiece,
              nextPiece: newNextPiece,
              isGameOver: isGameOver2,
              isRunning: !isGameOver2
            };
          }
        } else if (nextAction.action === "moveLeft") {
          const newPos = { x: updatedState.currentPiece.pos.x - 1, y: updatedState.currentPiece.pos.y };
          if (!GameLogic.checkCollision(updatedState.currentPiece, updatedState.board, newPos)) {
            updatedState = { ...updatedState, currentPiece: { ...updatedState.currentPiece, pos: newPos } };
          }
        } else if (nextAction.action === "moveRight") {
          const newPos = { x: updatedState.currentPiece.pos.x + 1, y: updatedState.currentPiece.pos.y };
          if (!GameLogic.checkCollision(updatedState.currentPiece, updatedState.board, newPos)) {
            updatedState = { ...updatedState, currentPiece: { ...updatedState.currentPiece, pos: newPos } };
          }
        } else if (nextAction.action === "rotate") {
          const rotatedShape = GameLogic.rotate(updatedState.currentPiece.shape);
          const rotatedPiece = { ...updatedState.currentPiece, shape: rotatedShape };
          const offsets = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: -1 }, { x: 2, y: 0 }, { x: -2, y: 0 }];
          for (const offset of offsets) {
            const newPos = {
              x: updatedState.currentPiece.pos.x + offset.x,
              y: updatedState.currentPiece.pos.y + offset.y
            };
            if (!GameLogic.checkCollision(rotatedPiece, updatedState.board, newPos)) {
              updatedState = { ...updatedState, currentPiece: { ...rotatedPiece, pos: newPos } };
              break;
            }
          }
        } else if (nextAction.action === "hardDrop") {
          const dropY = GameLogic.calculateGhostY(updatedState.currentPiece, updatedState.board);
          const newCurrentPiece = { ...updatedState.currentPiece, pos: { x: updatedState.currentPiece.pos.x, y: dropY } };
          const { newBoard, newCurrentPiece: nextPieceAfterLock, newNextPiece, isGameOver: isGameOver2 } = handleReplayLock({ ...updatedState, currentPiece: newCurrentPiece });
          updatedState = {
            ...updatedState,
            board: newBoard,
            currentPiece: nextPieceAfterLock,
            nextPiece: newNextPiece,
            isGameOver: isGameOver2,
            isRunning: !isGameOver2
          };
        }
        nextAction = ReplayLogic.getNextAction(prev.replayState)?.action;
      }
      if (updatedState.currentPiece === null && prev.replayState.actionIndex >= prev.replayState.actions.length) {
        updatedState = { ...updatedState, isRunning: false, isReplaying: false, isGameOver: true };
      }
      return updatedState;
    });
  };
  const handleReplayLock = (currentState) => {
    let newBoard = currentState.board;
    newBoard = GameLogic.lockPiece(newBoard, currentState.currentPiece);
    let linesRemoved = 0;
    const filteredBoard = newBoard.filter((row) => {
      if (row.every((cell) => cell !== EMPTY_CELL)) {
        linesRemoved++;
        return false;
      }
      return true;
    });
    while (filteredBoard.length < ROWS) {
      filteredBoard.unshift(Array(COLS).fill(EMPTY_CELL));
    }
    newBoard = filteredBoard;
    let newCurrentPiece = null;
    const { pieceName, nextIndex } = ReplayLogic.getNextPieceInQueue(currentState.replayState);
    if (pieceName) {
      newCurrentPiece = { ...TETROMINOS[pieceName], pos: { x: Math.floor(COLS / 2) - Math.ceil(TETROMINOS[pieceName].shape[0].length / 2), y: 0 } };
      currentState.replayState.pieceIndex = nextIndex;
    }
    const isGameOver2 = newCurrentPiece && GameLogic.checkCollision(newCurrentPiece, newBoard, newCurrentPiece.pos);
    return {
      newBoard,
      newCurrentPiece,
      newNextPiece: null,
      isGameOver: isGameOver2
    };
  };
  const handleKeyDown = useCallback((event) => {
    if (!isRunning || isGameOver || isPaused) {
      if (event.key === " " || event.key === "Enter") {
        startGame();
      }
      return;
    }
    if (isReplaying) return;
    switch (event.key) {
      case "ArrowLeft":
        movePiece(-1, 0, "moveLeft");
        break;
      case "ArrowRight":
        movePiece(1, 0, "moveRight");
        break;
      case "ArrowDown":
        if (!softDropActive) setSoftDropActive(true);
        break;
      case "ArrowUp":
      case "x":
        rotatePiece();
        break;
      case " ":
        event.preventDefault();
        hardDrop();
        break;
      case "p":
      case "P":
        togglePause();
        break;
    }
  }, [isRunning, isGameOver, isPaused, isReplaying, movePiece, rotatePiece, hardDrop, softDropActive, startGame, togglePause]);
  const handleKeyUp = useCallback((event) => {
    if (event.key === "ArrowDown") {
      setSoftDropActive(false);
    }
  }, []);
  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);
  const handleStartReplay = useCallback((scoreRecord) => {
    startGame(scoreRecord);
    setGameState((prev) => ({
      ...prev,
      score: scoreRecord.score,
      lines: scoreRecord.lines,
      level: scoreRecord.level
    }));
  }, [startGame]);
  const handleRestart = () => {
    startGame();
  };
  return /* @__PURE__ */ jsxDEV("div", { id: "root-container", children: [
    /* @__PURE__ */ jsxDEV(HighScores, { onStartReplay: handleStartReplay }, void 0, false, {
      fileName: "<stdin>",
      lineNumber: 692,
      columnNumber: 13
    }),
    /* @__PURE__ */ jsxDEV("div", { className: "tetris-container", children: [
      isReplaying && /* @__PURE__ */ jsxDEV("div", { className: "replay-mode-indicator", children: "REPLAY MODE" }, void 0, false, {
        fileName: "<stdin>",
        lineNumber: 695,
        columnNumber: 33
      }),
      /* @__PURE__ */ jsxDEV("div", { className: "game-board-wrapper", style: { position: "relative" }, children: [
        /* @__PURE__ */ jsxDEV(
          TetrisBoard,
          {
            board,
            currentPiece,
            ghostY,
            isReplaying
          },
          void 0,
          false,
          {
            fileName: "<stdin>",
            lineNumber: 697,
            columnNumber: 21
          }
        ),
        (isGameOver || isPaused) && /* @__PURE__ */ jsxDEV("div", { className: "game-over-overlay", children: [
          isGameOver && /* @__PURE__ */ jsxDEV("h1", { children: "GAME OVER" }, void 0, false, {
            fileName: "<stdin>",
            lineNumber: 706,
            columnNumber: 44
          }),
          isPaused && /* @__PURE__ */ jsxDEV("h1", { children: "PAUSED" }, void 0, false, {
            fileName: "<stdin>",
            lineNumber: 707,
            columnNumber: 42
          }),
          /* @__PURE__ */ jsxDEV("p", { children: [
            "Score: ",
            score
          ] }, void 0, true, {
            fileName: "<stdin>",
            lineNumber: 708,
            columnNumber: 29
          }),
          /* @__PURE__ */ jsxDEV("p", { children: [
            "Level: ",
            level
          ] }, void 0, true, {
            fileName: "<stdin>",
            lineNumber: 709,
            columnNumber: 29
          }),
          isReplaying && /* @__PURE__ */ jsxDEV("button", { className: "button", onClick: () => handleRestart(), children: "Start New Game" }, void 0, false, {
            fileName: "<stdin>",
            lineNumber: 712,
            columnNumber: 33
          }),
          !isReplaying && !isRunning && /* @__PURE__ */ jsxDEV("button", { className: "button", onClick: () => startGame(), children: isGameOver ? "Play Again" : "Start Game" }, void 0, false, {
            fileName: "<stdin>",
            lineNumber: 718,
            columnNumber: 33
          }),
          !isReplaying && isPaused && /* @__PURE__ */ jsxDEV("button", { className: "button", onClick: togglePause, children: "Resume (P)" }, void 0, false, {
            fileName: "<stdin>",
            lineNumber: 724,
            columnNumber: 33
          })
        ] }, void 0, true, {
          fileName: "<stdin>",
          lineNumber: 705,
          columnNumber: 25
        })
      ] }, void 0, true, {
        fileName: "<stdin>",
        lineNumber: 696,
        columnNumber: 17
      })
    ] }, void 0, true, {
      fileName: "<stdin>",
      lineNumber: 694,
      columnNumber: 13
    }),
    /* @__PURE__ */ jsxDEV("div", { className: "stats-panel", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "stats", children: [
        /* @__PURE__ */ jsxDEV("h2", { children: "Stats" }, void 0, false, {
          fileName: "<stdin>",
          lineNumber: 735,
          columnNumber: 21
        }),
        /* @__PURE__ */ jsxDEV("p", { children: [
          "Score: ",
          score
        ] }, void 0, true, {
          fileName: "<stdin>",
          lineNumber: 736,
          columnNumber: 21
        }),
        /* @__PURE__ */ jsxDEV("p", { children: [
          "Lines: ",
          lines
        ] }, void 0, true, {
          fileName: "<stdin>",
          lineNumber: 737,
          columnNumber: 21
        }),
        /* @__PURE__ */ jsxDEV("p", { children: [
          "Level: ",
          level
        ] }, void 0, true, {
          fileName: "<stdin>",
          lineNumber: 738,
          columnNumber: 21
        })
      ] }, void 0, true, {
        fileName: "<stdin>",
        lineNumber: 734,
        columnNumber: 17
      }),
      !isReplaying && /* @__PURE__ */ jsxDEV(NextPieceDisplay, { piece: nextPiece }, void 0, false, {
        fileName: "<stdin>",
        lineNumber: 741,
        columnNumber: 34
      }),
      /* @__PURE__ */ jsxDEV("div", { className: "stats", children: [
        /* @__PURE__ */ jsxDEV("h2", { children: "Controls" }, void 0, false, {
          fileName: "<stdin>",
          lineNumber: 744,
          columnNumber: 21
        }),
        /* @__PURE__ */ jsxDEV("p", { children: "\u2190 \u2192 : Move" }, void 0, false, {
          fileName: "<stdin>",
          lineNumber: 745,
          columnNumber: 21
        }),
        /* @__PURE__ */ jsxDEV("p", { children: "\u2193 : Soft Drop" }, void 0, false, {
          fileName: "<stdin>",
          lineNumber: 746,
          columnNumber: 21
        }),
        /* @__PURE__ */ jsxDEV("p", { children: "\u2191 / X : Rotate" }, void 0, false, {
          fileName: "<stdin>",
          lineNumber: 747,
          columnNumber: 21
        }),
        /* @__PURE__ */ jsxDEV("p", { children: "Space : Hard Drop" }, void 0, false, {
          fileName: "<stdin>",
          lineNumber: 748,
          columnNumber: 21
        }),
        /* @__PURE__ */ jsxDEV("p", { children: "P : Pause" }, void 0, false, {
          fileName: "<stdin>",
          lineNumber: 749,
          columnNumber: 21
        }),
        /* @__PURE__ */ jsxDEV("button", { className: "button", onClick: handleRestart, children: "Restart Game" }, void 0, false, {
          fileName: "<stdin>",
          lineNumber: 751,
          columnNumber: 21
        }),
        /* @__PURE__ */ jsxDEV("button", { className: "button", onClick: togglePause, disabled: !isRunning || isGameOver, children: isPaused ? "Resume" : "Pause" }, void 0, false, {
          fileName: "<stdin>",
          lineNumber: 754,
          columnNumber: 21
        })
      ] }, void 0, true, {
        fileName: "<stdin>",
        lineNumber: 743,
        columnNumber: 17
      })
    ] }, void 0, true, {
      fileName: "<stdin>",
      lineNumber: 733,
      columnNumber: 13
    })
  ] }, void 0, true, {
    fileName: "<stdin>",
    lineNumber: 691,
    columnNumber: 9
  });
};
if (typeof React !== "undefined" && typeof ReactDOM !== "undefined") {
  ReactDOM.createRoot(document.getElementById("root")).render(/* @__PURE__ */ jsxDEV(TetrisApp, {}, void 0, false, {
    fileName: "<stdin>",
    lineNumber: 765,
    columnNumber: 63
  }));
} else {
  console.error("React or ReactDOM not loaded.");
}
