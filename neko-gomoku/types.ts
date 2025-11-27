
export type Player = 'black' | 'white';

export interface Coordinate {
  x: number;
  y: number;
}

// A shape is defined by a list of relative coordinates (e.g., [0,0], [0,1])
export type Shape = Coordinate[];

export interface CellData {
  player: Player;
  rotation: number; // Rotation in degrees
}

export type Difficulty = 'easy' | 'hard' | 'hell';

export interface GameState {
  board: (CellData | null)[][]; // 12x12 grid containing rich cell data
  currentPlayer: Player;
  winner: Player | null;
  turnLength: number; // 1, 2, or 3
  gameMode: 'pvp' | 'pve';
  difficulty: Difficulty;
  isGameOver: boolean;
  history: Coordinate[][];
}

export const BOARD_SIZE = 12;
