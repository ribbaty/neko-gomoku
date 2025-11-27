
import { Player, Shape, Coordinate, BOARD_SIZE, CellData } from '../types';

export const generateRandomLength = (): number => {
  return Math.floor(Math.random() * 3) + 1; // 1, 2, or 3
};

// Normalize coordinate list relative to (0,0)
export const normalizeShape = (shape: Shape): Shape => {
  if (shape.length === 0) return shape;
  const minX = Math.min(...shape.map(p => p.x));
  const minY = Math.min(...shape.map(p => p.y));
  return shape.map(p => ({ x: p.x - minX, y: p.y - minY }));
};

// Rotate shape 90 degrees
export const rotateShape = (shape: Shape): Shape => {
  const rotated = shape.map(p => ({ x: -p.y, y: p.x }));
  return normalizeShape(rotated);
};

// Generate all possible valid shapes (polyminoes) for a given size
export const getShapesForSize = (size: number): Shape[] => {
  let baseShapes: Shape[] = [];

  if (size === 1) {
    baseShapes = [[{x: 0, y: 0}]];
  } else if (size === 2) {
    baseShapes = [
        [{x: 0, y: 0}, {x: 0, y: 1}], // Orthogonal
        [{x: 0, y: 0}, {x: 1, y: 1}]  // Diagonal
    ]; 
  } else if (size === 3) {
    baseShapes = [
      [{x: 0, y: 0}, {x: 0, y: 1}, {x: 0, y: 2}], // Orthogonal Line
      [{x: 0, y: 0}, {x: 0, y: 1}, {x: 1, y: 1}], // L-shape
      [{x: 0, y: 0}, {x: 1, y: 1}, {x: 2, y: 2}]  // Diagonal Line
    ];
  }

  const permutations: Shape[] = [];
  const seen = new Set<string>();

  for (const base of baseShapes) {
    let current = base;
    for (let i = 0; i < 4; i++) {
      current = rotateShape(current);
      const norm = normalizeShape(current);
      norm.sort((a, b) => (a.y - b.y) || (a.x - b.x));
      
      const key = JSON.stringify(norm);
      if (!seen.has(key)) {
        seen.add(key);
        permutations.push(norm);
      }
    }
  }

  return permutations;
};

export const canPlaceShape = (
  board: (CellData | null)[][],
  shape: Shape,
  anchor: Coordinate
): boolean => {
  for (const block of shape) {
    const targetX = anchor.x + block.x;
    const targetY = anchor.y + block.y;

    // Check bounds
    if (targetX < 0 || targetX >= BOARD_SIZE || targetY < 0 || targetY >= BOARD_SIZE) {
      return false;
    }

    // Check collision
    if (board[targetY][targetX] !== null) {
      return false;
    }
  }
  return true;
};

export const checkWin = (board: (CellData | null)[][], player: Player): boolean => {
  const directions = [
    { x: 1, y: 0 }, // Horizontal
    { x: 0, y: 1 }, // Vertical
    { x: 1, y: 1 }, // Diagonal Down-Right
    { x: 1, y: -1 } // Diagonal Up-Right
  ];

  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      // Logic update: Access .player property
      if (board[y][x]?.player !== player) continue;

      for (const dir of directions) {
        let count = 1;
        for (let k = 1; k < 7; k++) {
          const nx = x + dir.x * k;
          const ny = y + dir.y * k;
          if (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE && board[ny][nx]?.player === player) {
            count++;
          } else {
            break;
          }
        }
        if (count >= 7) return true;
      }
    }
  }
  return false;
};

export const isNeighbor = (a: Coordinate, b: Coordinate): boolean => {
  const dx = Math.abs(a.x - b.x);
  const dy = Math.abs(a.y - b.y);
  // Allow orthogonal (1,0)/(0,1) AND diagonal (1,1) neighbors
  return dx <= 1 && dy <= 1 && !(dx === 0 && dy === 0);
};

export const getAbsoluteCoordinates = (shape: Shape, anchor: Coordinate): Coordinate[] => {
  return shape.map(p => ({ x: anchor.x + p.x, y: anchor.y + p.y }));
};
