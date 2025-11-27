
import { Player, Shape, Coordinate, BOARD_SIZE, CellData, Difficulty } from '../types';
import { canPlaceShape, checkWin, getAbsoluteCoordinates, getShapesForSize } from './gameLogic';

// Helper to count available space in a direction (including own pieces and empty spots)
const countSpaceInDirection = (
    board: (CellData | null)[][], 
    x: number, 
    y: number, 
    dx: number, 
    dy: number, 
    player: Player
): number => {
    let space = 0;
    let k = 1;
    while (true) {
        const nx = x + dx * k;
        const ny = y + dy * k;
        if (nx < 0 || nx >= BOARD_SIZE || ny < 0 || ny >= BOARD_SIZE) break;
        const cell = board[ny][nx];
        // Stop at opponent piece
        if (cell !== null && cell.player !== player) break; 
        space++;
        k++;
    }
    return space;
};

const evaluateBoard = (board: (CellData | null)[][], player: Player, difficulty: Difficulty): number => {
  let score = 0;
  
  // Difficulty Multipliers
  // Easy: Poor judgment
  // Hard: Balanced
  // Hell: High priority on blocking, but smart enough to attack
  let defenseMultiplier = 1.0;
  if (difficulty === 'easy') defenseMultiplier = 0.2;
  else if (difficulty === 'hell') defenseMultiplier = 2.5;

  const directions = [
    { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 1, y: -1 }
  ];

  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (board[y][x] === null) continue;
      
      const cellData = board[y][x];
      const isMe = cellData?.player === player;
      const currentPlayerVal = cellData?.player;

      if (!currentPlayerVal) continue;

      for (const dir of directions) {
        // Optimization: Only score the start of a sequence to avoid double counting
        const bx = x - dir.x;
        const by = y - dir.y;
        const prevInBounds = bx >= 0 && bx < BOARD_SIZE && by >= 0 && by < BOARD_SIZE;
        if (prevInBounds && board[by][bx]?.player === currentPlayerVal) {
            continue; 
        }

        // Count actual consecutive stones
        let consecutive = 1;
        let k = 1;
        while (k < 7) {
             const nx = x + dir.x * k;
             const ny = y + dir.y * k;
             if (nx < 0 || nx >= BOARD_SIZE || ny < 0 || ny >= BOARD_SIZE) break;
             if (board[ny][nx]?.player !== currentPlayerVal) break;
             consecutive++;
             k++;
        }

        // CRITICAL: Dead line pruning
        // If backward space + forward space + 1 (current) < 7, it's a dead line.
        const backSpace = countSpaceInDirection(board, x, y, -dir.x, -dir.y, currentPlayerVal);
        const fwdSpace = countSpaceInDirection(board, x, y, dir.x, dir.y, currentPlayerVal);
        
        if (backSpace + fwdSpace + 1 < 7) {
            continue; // Dead line, worth nothing (or very little)
        }

        // Determine blockage status of ends
        const nextX = x + dir.x * consecutive;
        const nextY = y + dir.y * consecutive;
        const prevX = x - dir.x;
        const prevY = y - dir.y;
        
        let blockedEnds = 0;
        if (nextX < 0 || nextX >= BOARD_SIZE || nextY < 0 || nextY >= BOARD_SIZE || (board[nextY][nextX] !== null && board[nextY][nextX]?.player !== currentPlayerVal)) {
            blockedEnds++;
        }
        if (prevX < 0 || prevX >= BOARD_SIZE || prevY < 0 || prevY >= BOARD_SIZE || (board[prevY][prevX] !== null && board[prevY][prevX]?.player !== currentPlayerVal)) {
            blockedEnds++;
        }

        // Steeper Scoring Curve for Connect 7
        let lineScore = 0;

        if (consecutive >= 7) lineScore = 100000000; // Win
        else if (consecutive === 6) {
             if (blockedEnds === 0) lineScore = 5000000; // Live 6 (Instant threat)
             else if (blockedEnds === 1) lineScore = 500000; // Dead 6 (Forced block)
        }
        else if (consecutive === 5) {
             if (blockedEnds === 0) lineScore = 100000; 
             else if (blockedEnds === 1) lineScore = 10000;
        }
        else if (consecutive === 4) {
             if (blockedEnds === 0) lineScore = 5000;
             else if (blockedEnds === 1) lineScore = 1000;
        }
        else if (consecutive === 3) {
             if (blockedEnds === 0) lineScore = 500;
             else if (blockedEnds === 1) lineScore = 100;
        }
        else if (consecutive === 2) {
             if (blockedEnds === 0) lineScore = 50;
        }

        // Apply Defensive Multiplier
        if (!isMe) {
            lineScore *= defenseMultiplier;
            // In Hell mode, prioritize blocking high-level threats even more
            if (difficulty === 'hell' && consecutive >= 5) {
                lineScore *= 2.0; 
            }
        }

        score += isMe ? lineScore : -lineScore;
      }
    }
  }
  return score;
};

export const findBestMove = (
  board: (CellData | null)[][],
  turnLength: number,
  player: Player,
  difficulty: Difficulty
): { anchor: Coordinate, shape: Shape } | null => {
  let bestScore = -Infinity;
  let bestMove: { anchor: Coordinate, shape: Shape } | null = null;
  
  const possibleShapes = getShapesForSize(turnLength);

  // Noise factor
  let noiseRange = 20;
  if (difficulty === 'easy') noiseRange = 5000; 
  if (difficulty === 'hell') noiseRange = 0; // Deterministic in Hell mode

  for (const testShape of possibleShapes) {
      for (let y = 0; y < BOARD_SIZE; y++) {
          for (let x = 0; x < BOARD_SIZE; x++) {
              if (canPlaceShape(board, testShape, { x, y })) {
                  // Simulate Move
                  const coords = getAbsoluteCoordinates(testShape, { x, y });
                  
                  const newBoard = board.map(row => [...row]);
                  // AI uses 0 rotation as default
                  coords.forEach(c => newBoard[c.y][c.x] = { player, rotation: 0 });

                  // Check Instant Win
                  if (checkWin(newBoard, player)) {
                      return { anchor: { x, y }, shape: testShape };
                  }

                  // Evaluate
                  const baseScore = evaluateBoard(newBoard, player, difficulty);
                  
                  // Add randomness
                  const noise = Math.random() * noiseRange; 
                  const finalScore = baseScore + noise;

                  if (finalScore > bestScore) {
                      bestScore = finalScore;
                      bestMove = { anchor: { x, y }, shape: [...testShape] };
                  }
              }
          }
      }
  }

  return bestMove;
};
