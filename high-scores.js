import React from 'react';
import { TETROMINOS, EMPTY_CELL } from 'game-constants';
import WebsimSocket from '@websim-dev/websim-socket';

const room = new WebsimSocket();
const HS_COLLECTION = 'tetris_highscore_v1'; // Versioned collection for schema safety

/**
 * Fetches the list of high scores.
 * @returns {Array<Object>} List of high score records.
 */
export const useHighScores = () => {
  const [scores, setScores] = React.useState([]);

  React.useEffect(() => {
    const unsubscribe = room.collection(HS_COLLECTION).subscribe((records) => {
      // Sort records by score descending (getList returns newest first, we need score-based sorting)
      records.sort((a, b) => b.score - a.score);
      setScores(records.slice(0, 10)); // Limit to Top 10
    });
    
    // Initial fetch
    setScores(room.collection(HS_COLLECTION).getList().sort((a, b) => b.score - a.score).slice(0, 10));

    return () => unsubscribe();
  }, []);

  return scores;
};

/**
 * Submits a new high score record.
 * @param {number} score - Final score.
 * @param {number} level - Final level.
 * @param {number} lines - Final lines cleared.
 * @param {Array<Object>} replayData - The history of moves (for replay).
 */
export const submitHighScore = async (score, level, lines, replayData) => {
  try {
    const record = await room.collection(HS_COLLECTION).create({
      score,
      level,
      lines,
      replayData,
    });
    console.log('High score submitted:', record);
  } catch (error) {
    console.error('Error submitting high score:', error);
  }
};

const NextPieceDisplay = ({ pieceName }) => {
    const piece = TETROMINOS[pieceName];
    if (!piece) return null;

    // Create a 4x4 grid container for rendering the next piece
    const size = piece.shape.length;
    const paddingX = Math.floor((4 - size) / 2);
    const paddingY = Math.floor((4 - size) / 2);

    const gridCells = [];
    
    for(let y=0; y<4; y++) {
        for(let x=0; x<4; x++) {
            let color = 'transparent';
            
            // Map 4x4 coordinate back to the actual piece shape
            const shapeX = x - paddingX;
            const shapeY = y - paddingY;

            if (shapeX >= 0 && shapeX < size && shapeY >= 0 && shapeY < size) {
                if (piece.shape[shapeY][shapeX] !== EMPTY_CELL) {
                    color = piece.color;
                }
            }
            
            gridCells.push(
                <div key={`${y}-${x}`} className="cell" style={{ backgroundColor: color }}></div>
            );
        }
    }
    
    return (
        <div className="next-piece-display">
            {gridCells}
        </div>
    );
};


export function HighScores({ onStartReplay }) {
  const scores = useHighScores();

  return (
    <div className="sidebar">
      <h2>High Scores (Top 10)</h2>
      <div className="high-scores-list">
        <ol>
          {scores.map((score, index) => (
            <li key={score.id} className="score-item">
              <div>
                <strong>{index + 1}. {score.username}</strong>
                <span className="score-details"> ({score.score} pts)</span>
                <button 
                    className="button replay-button" 
                    onClick={() => onStartReplay(score)}
                    disabled={!score.replayData || score.replayData.length === 0}
                >
                    Replay
                </button>
              </div>
              
              <div className="score-details">
                Lvl: {score.level} | Lines: {score.lines}
              </div>
            </li>
          ))}
        </ol>
        {scores.length === 0 && <p>Loading or no scores yet...</p>}
      </div>
    </div>
  );
}