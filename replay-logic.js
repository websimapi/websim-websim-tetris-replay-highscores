/**
 * Logic for deterministic Tetris replay.
 * 
 * Replay data structure:
 * { 
 *   pieceQueue: Array<string>, // names of pieces in the order they appeared
 *   actions: Array<{ time: number, action: string, data?: any }> // timeline of player input/game events
 * }
 */

// Helper to determine the next piece from the queue
export const getNextPieceInQueue = (replayState) => {
    if (replayState.pieceIndex >= replayState.pieceQueue.length) {
        return null; // End of replay queue
    }
    const pieceName = replayState.pieceQueue[replayState.pieceIndex];
    return { pieceName, nextIndex: replayState.pieceIndex + 1 };
};

// Helper to get the next action from the timeline
export const getNextAction = (replayState) => {
    if (replayState.actionIndex >= replayState.actions.length) {
        return null; // End of actions
    }
    return { 
        action: replayState.actions[replayState.actionIndex], 
        nextIndex: replayState.actionIndex + 1 
    };
};

/**
 * Initializes the replay state based on stored high score data.
 * @param {Object} scoreData - The high score record.
 * @returns {{
 *   pieceQueue: Array<string>,
 *   actions: Array<Object>,
 *   pieceIndex: number,
 *   actionIndex: number,
 *   startTime: number
 * }}
 */
export const initializeReplayState = (scoreData) => {
    // Assuming replayData structure is { pieceQueue, actions }
    const { pieceQueue, actions } = scoreData.replayData;
    
    return {
        pieceQueue: pieceQueue || [],
        actions: actions || [],
        pieceIndex: 0,
        actionIndex: 0,
        startTime: performance.now(),
    };
};

/**
 * Checks if the replay is finished.
 * @param {Object} replayState 
 * @returns {boolean}
 */
export const isReplayFinished = (replayState) => {
    return replayState.actionIndex >= replayState.actions.length && replayState.pieceIndex >= replayState.pieceQueue.length;
};

