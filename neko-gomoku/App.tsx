
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Player, GameState, Shape, Coordinate, BOARD_SIZE, CellData, Difficulty } from './types';
import { generateRandomLength, checkWin, getAbsoluteCoordinates, isNeighbor, normalizeShape } from './utils/gameLogic';
import { findBestMove } from './utils/ai';
import { playSound } from './utils/audio';
import Cell from './components/Cell';
import ShapePreview from './components/ShapePreview';
import { RotateCcw, User, Cpu, Cat, Trophy, Info, BookOpen, Sparkles, Baby, Shield, Skull, PawPrint } from 'lucide-react';
import clsx from 'clsx';

const INITIAL_BOARD = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    board: INITIAL_BOARD,
    currentPlayer: 'black',
    winner: null,
    turnLength: generateRandomLength(),
    gameMode: 'pve', 
    difficulty: 'hard',
    isGameOver: false,
    history: []
  });

  const [isAiThinking, setIsAiThinking] = useState(false);
  
  // Drawing State
  const [drawingPath, setDrawingPath] = useState<Coordinate[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  
  const aiTimeoutRef = useRef<number | null>(null);

  const resetGame = (mode: 'pvp' | 'pve', newDifficulty?: Difficulty) => {
    setGameState(prev => ({
      board: Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null)),
      currentPlayer: 'black',
      winner: null,
      turnLength: generateRandomLength(),
      gameMode: mode,
      difficulty: newDifficulty || prev.difficulty,
      isGameOver: false,
      history: []
    }));
    setDrawingPath([]);
    setIsDrawing(false);
    setIsAiThinking(false);
    if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);
    playSound('pop');
  };

  const changeDifficulty = (diff: Difficulty) => {
      // If currently in PvE, just update state, game will use it next turn or on reset
      setGameState(prev => ({ ...prev, difficulty: diff }));
      playSound('pop');
  };

  // AI Turn Logic
  useEffect(() => {
    if (gameState.gameMode === 'pve' && gameState.currentPlayer === 'white' && !gameState.isGameOver) {
      setIsAiThinking(true);
      
      aiTimeoutRef.current = window.setTimeout(() => {
        const move = findBestMove(gameState.board, gameState.turnLength, 'white', gameState.difficulty);
        
        if (move) {
          executeMove(move.anchor, move.shape, 'white');
        } else {
          setGameState(prev => ({
              ...prev,
              currentPlayer: 'black',
              turnLength: generateRandomLength()
          }));
        }
        setIsAiThinking(false);
      }, 1000);
    }
    return () => {
        if(aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.currentPlayer, gameState.gameMode, gameState.isGameOver, gameState.difficulty]);

  const calculateRotation = (current: Coordinate, next?: Coordinate, prev?: Coordinate): number => {
      if (!next && !prev) return 0; 
      const target = next || prev;
      if (!target) return 0;
      const dx = next ? (next.x - current.x) : (current.x - prev!.x);
      const dy = next ? (next.y - current.y) : (current.y - prev!.y);
      const angleRad = Math.atan2(dy, dx);
      let angleDeg = angleRad * (180 / Math.PI);
      return angleDeg + 90;
  };

  const executeMove = (anchor: Coordinate, shape: Shape, player: Player) => {
    playSound('splash');
    const coords = getAbsoluteCoordinates(shape, anchor);
    
    const newBoard = gameState.board.map(row => [...row]);
    
    coords.forEach((p, index) => {
        let rotation = 0;
        const next = coords[index + 1];
        const prev = coords[index - 1];
        rotation = calculateRotation(p, next, prev);
        
        newBoard[p.y][p.x] = {
            player,
            rotation
        };
    });

    const hasWon = checkWin(newBoard, player);
    
    if (hasWon) {
        playSound(player === 'black' ? 'win-black' : 'win-white');
    }

    setGameState(prev => ({
      ...prev,
      board: newBoard,
      currentPlayer: hasWon ? prev.currentPlayer : (prev.currentPlayer === 'black' ? 'white' : 'black'),
      winner: hasWon ? player : null,
      isGameOver: hasWon,
      turnLength: hasWon ? prev.turnLength : generateRandomLength(),
      history: [...prev.history, coords]
    }));
  };

  const executeDrawnPath = (path: Coordinate[]) => {
      const player = gameState.currentPlayer;
      const newBoard = gameState.board.map(row => [...row]);
      
      path.forEach((p, i) => {
          const next = path[i+1];
          const prev = path[i-1];
          const rotation = calculateRotation(p, next, prev);
          newBoard[p.y][p.x] = { player, rotation };
      });
      
      playSound('splash');

      const hasWon = checkWin(newBoard, player);
      if (hasWon) playSound(player === 'black' ? 'win-black' : 'win-white');

      setGameState(prev => ({
        ...prev,
        board: newBoard,
        currentPlayer: hasWon ? prev.currentPlayer : (prev.currentPlayer === 'black' ? 'white' : 'black'),
        winner: hasWon ? player : null,
        isGameOver: hasWon,
        turnLength: hasWon ? prev.turnLength : generateRandomLength(),
        history: [...prev.history, path]
      }));
  }

  // --- Interaction Handlers ---

  const handleMouseDown = (x: number, y: number) => {
    if (gameState.isGameOver || isAiThinking) return;
    if (gameState.gameMode === 'pve' && gameState.currentPlayer === 'white') return;
    if (gameState.board[y][x] !== null) {
        playSound('error');
        return;
    }

    setIsDrawing(true);
    setDrawingPath([{ x, y }]);
    playSound('pop');
  };

  const handleMouseEnter = (x: number, y: number) => {
    if (!isDrawing) return;
    if (drawingPath.length === 0) return;

    const currentPos = { x, y };
    const lastPos = drawingPath[drawingPath.length - 1];
    
    // Backtracking
    if (drawingPath.length > 1) {
        const prevPos = drawingPath[drawingPath.length - 2];
        if (prevPos.x === x && prevPos.y === y) {
            setDrawingPath(prev => prev.slice(0, -1));
            playSound('undo');
            return;
        }
    }

    // Adding new step
    if (drawingPath.length < gameState.turnLength) {
        if (isNeighbor(lastPos, currentPos) && gameState.board[y][x] === null) {
            if (!drawingPath.some(p => p.x === x && p.y === y)) {
                setDrawingPath(prev => [...prev, currentPos]);
                playSound('pop');
            }
        }
    }
  };

  const handleMouseUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    if (drawingPath.length === gameState.turnLength) {
        executeDrawnPath(drawingPath);
    } else {
        if (drawingPath.length > 0) playSound('undo');
    }
    setDrawingPath([]);
  };

  useEffect(() => {
      const handleGlobalMouseUp = () => {
          if (isDrawing) handleMouseUp();
      };
      window.addEventListener('mouseup', handleGlobalMouseUp);
      return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  });

  return (
    <div className="min-h-screen bg-white text-black flex flex-col items-center py-6 px-4 font-sans select-none overflow-hidden relative">
      
      <style>{`
        .bg-dots {
            background-color: #ffffff;
            background-image: radial-gradient(#000000 1px, transparent 1px);
            background-size: 20px 20px;
        }
        @keyframes jump-out {
            0% { transform: translateY(100vh) scale(0.5); opacity: 0; }
            50% { transform: translateY(-50px) scale(1.2) rotate(-5deg); opacity: 1; }
            70% { transform: translateY(20px) scale(0.9) rotate(5deg); }
            85% { transform: translateY(-10px) scale(1.05) rotate(-2deg); }
            100% { transform: translateY(0) scale(1) rotate(0); }
        }
        @keyframes cat-bounce {
            0%, 100% { transform: translateY(0) rotate(0deg); }
            25% { transform: translateY(-20px) rotate(-5deg); }
            50% { transform: translateY(0) rotate(0deg); }
            75% { transform: translateY(-10px) rotate(5deg); }
        }
        @keyframes jelly {
            0% { transform: scale(0.5, 0.5); }
            30% { transform: scale(1.25, 0.75); }
            40% { transform: scale(0.75, 1.25); }
            50% { transform: scale(1.15, 0.85); }
            65% { transform: scale(0.95, 1.05); }
            75% { transform: scale(1.05, 0.95); }
            100% { transform: scale(1, 1); }
        }
        @keyframes splash-ring {
            0% { transform: scale(0.5); border-width: 4px; opacity: 1; }
            100% { transform: scale(1.6); border-width: 0px; opacity: 0; }
        }
        @keyframes splash-particle-1 {
            0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
            100% { transform: translate(-80%, -180%) scale(0.5); opacity: 0; }
        }
        @keyframes splash-particle-2 {
            0% { transform: translate(50%, -50%) scale(1); opacity: 1; }
            100% { transform: translate(180%, -80%) scale(0.5); opacity: 0; }
        }
        @keyframes splash-particle-3 {
            0% { transform: translate(-50%, 50%) scale(1); opacity: 1; }
            100% { transform: translate(-80%, 180%) scale(0.5); opacity: 0; }
        }
        @keyframes splash-particle-4 {
            0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
            100% { transform: translate(-180%, -80%) scale(0.5); opacity: 0; }
        }
        @keyframes paw-walk {
            0% { opacity: 0; transform: scale(0.5) rotate(var(--r)); }
            20% { opacity: 0.6; transform: scale(1) rotate(var(--r)); }
            80% { opacity: 0.6; transform: scale(1) rotate(var(--r)); }
            100% { opacity: 0; transform: scale(1.2) rotate(var(--r)); }
        }
        .animate-jelly {
            animation: jelly 0.6s cubic-bezier(0.25, 1, 0.5, 1) forwards;
        }
        .animate-cat-bounce {
            animation: cat-bounce 1s ease-in-out infinite;
        }
        .animate-splash-ring {
            animation: splash-ring 0.5s ease-out forwards;
        }
        .animate-splash-particle-1 { animation: splash-particle-1 0.4s ease-out forwards; }
        .animate-splash-particle-2 { animation: splash-particle-2 0.5s ease-out forwards; }
        .animate-splash-particle-3 { animation: splash-particle-3 0.4s ease-out forwards; }
        .animate-splash-particle-4 { animation: splash-particle-4 0.5s ease-out forwards; }
      `}</style>
      
      <div className="absolute inset-0 bg-dots z-0 opacity-10 pointer-events-none" />

      {/* Header */}
      <header className="mb-6 text-center z-10 relative">
        <h1 className="text-4xl font-black text-black mb-2 flex items-center justify-center gap-3 tracking-tighter">
          <span className="bg-black text-white p-2 rounded-xl border-2 border-black transform -rotate-6"><Cat size={24}/></span>
          <span>猫爪棋</span>
          <span className="bg-white text-black border-2 border-black p-2 rounded-xl transform rotate-6"><Cat size={24}/></span>
        </h1>
      </header>

      {/* Main Game Container */}
      <div className="flex flex-col lg:flex-row gap-6 items-center lg:items-start max-w-6xl w-full justify-center z-10 relative">
        
        {/* Left Panel */}
        <div className="w-full lg:w-72 flex flex-col gap-4 order-2 lg:order-1 max-w-[540px]">
          
          <div className="flex gap-4">
              <div className="flex-1 bg-white p-4 rounded-3xl border-[3px] border-black shadow-[4px_4px_0_#000000] flex flex-col items-center justify-center">
                 <h2 className="text-[10px] tracking-widest text-gray-500 font-black mb-2 uppercase">TURN</h2>
                 <div className={clsx(
                     "text-sm font-black py-2 px-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 border-2 w-full",
                     gameState.currentPlayer === 'black' 
                        ? "bg-black text-white border-black" 
                        : "bg-white text-black border-black"
                 )}>
                     {gameState.currentPlayer === 'black' ? 'BLACK' : 'WHITE'}
                 </div>
              </div>
              <div className="flex-1 bg-white p-4 rounded-3xl border-[3px] border-black shadow-[4px_4px_0_#000000] flex items-center justify-center">
                 <ShapePreview 
                    length={gameState.turnLength}
                    player={gameState.currentPlayer}
                 />
              </div>
          </div>

          {/* Difficulty Selector */}
          <div className="bg-white p-4 rounded-3xl border-[3px] border-black shadow-[4px_4px_0_#000000] flex flex-col gap-2">
            <h3 className="font-black text-gray-500 uppercase tracking-widest text-[10px] mb-1">
                AI DIFFICULTY
            </h3>
            <div className="flex gap-2">
                {[
                    { id: 'easy', icon: Baby, label: '简单' },
                    { id: 'hard', icon: Shield, label: '困难' },
                    { id: 'hell', icon: Skull, label: '地狱' }
                ].map((diff) => (
                    <button
                        key={diff.id}
                        onClick={() => changeDifficulty(diff.id as Difficulty)}
                        disabled={gameState.gameMode === 'pvp'}
                        className={clsx(
                            "flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-xl border-2 transition-all",
                            gameState.difficulty === diff.id 
                                ? "bg-black text-white border-black" 
                                : "bg-white text-gray-400 border-gray-200 hover:border-black hover:text-black",
                            gameState.gameMode === 'pvp' && "opacity-30 grayscale cursor-not-allowed"
                        )}
                    >
                        <diff.icon size={16} className="mb-1" />
                        <span className="text-[10px] font-bold">{diff.label}</span>
                    </button>
                ))}
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border-[3px] border-black shadow-[4px_4px_0_#000000] flex flex-col gap-2">
            <h3 className="flex items-center gap-2 font-black text-gray-500 uppercase tracking-widest text-[10px] mb-1">
                <BookOpen size={14}/> 游戏规则
            </h3>
            <ul className="text-xs text-gray-800 space-y-2 font-bold px-2">
                <li className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-gray-300"></span>
                    黑白猫咪轮流踩下脚印
                </li>
                <li className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-gray-300"></span>
                    在横、竖、斜任意方向
                </li>
                 <li className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-gray-300"></span>
                    连成 <span className="text-white bg-black px-1.5 py-0.5 rounded-md mx-1">7</span> 个同色获胜
                </li>
                <li className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-gray-300"></span>
                    每回合随机走 <span className="text-white bg-black px-1.5 py-0.5 rounded-md mx-1">1-3</span> 步
                </li>
                <li className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-gray-300"></span>
                    按住鼠标可直线或斜线拖拽
                </li>
            </ul>
          </div>

          <div className="bg-white p-5 rounded-3xl border-[3px] border-black shadow-[4px_4px_0_#000000] flex flex-col gap-3">
            <h3 className="font-black text-gray-500 uppercase tracking-widest text-[10px]">GAME MODES</h3>
            <div className="grid grid-cols-2 gap-3">
                <button 
                    onClick={() => resetGame('pve')}
                    className={clsx(
                        "flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all hover:-translate-y-1 active:translate-y-0",
                        gameState.gameMode === 'pve' ? "border-black bg-black text-white" : "border-gray-200 text-gray-400"
                    )}
                >
                    <Cpu size={20} className="mb-1" />
                    <span className="text-[10px] font-bold">PvE</span>
                </button>
                <button 
                    onClick={() => resetGame('pvp')}
                    className={clsx(
                        "flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all hover:-translate-y-1 active:translate-y-0",
                        gameState.gameMode === 'pvp' ? "border-black bg-black text-white" : "border-gray-200 text-gray-400"
                    )}
                >
                    <User size={20} className="mb-1" />
                    <span className="text-[10px] font-bold">PvP</span>
                </button>
            </div>
            <button 
                onClick={() => resetGame(gameState.gameMode)}
                className="mt-1 w-full flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-black font-bold py-3 rounded-2xl border-2 border-transparent transition-all uppercase tracking-widest text-[10px]"
            >
                <RotateCcw size={14} />
                Restart
            </button>
          </div>
        </div>

        {/* Right Panel: The Board */}
        <div className="order-1 lg:order-2 flex justify-center">
            {/* Board Container */}
            <div className="bg-gray-50 p-4 rounded-[2.5rem] shadow-[0_10px_0_#000000] border-[4px] border-black relative">
                
                {/* Board Grid */}
                <div 
                    className="grid bg-black border-[3px] border-black rounded-[2rem] overflow-hidden touch-none relative"
                    style={{ 
                        gridTemplateColumns: `repeat(${BOARD_SIZE}, minmax(0, 1fr))`,
                        gridTemplateRows: `repeat(${BOARD_SIZE}, minmax(0, 1fr))`,
                        width: 'min(90vw, 500px)',
                        height: 'min(90vw, 500px)',
                        gap: '3px'
                    }}
                >
                    {gameState.board.map((row, y) => (
                        row.map((cellData, x) => {
                            const pathIndex = drawingPath.findIndex(p => p.x === x && p.y === y);
                            const isDrawingPart = pathIndex !== -1;
                            
                            let drawingRotation = 0;
                            if (isDrawingPart) {
                                const next = drawingPath[pathIndex + 1];
                                const prev = drawingPath[pathIndex - 1];
                                drawingRotation = calculateRotation({x, y}, next, prev);
                            }

                            return (
                                <Cell 
                                    key={`${x}-${y}`}
                                    x={x}
                                    y={y}
                                    data={cellData}
                                    isDrawing={isDrawingPart}
                                    drawingPlayer={gameState.currentPlayer}
                                    drawingRotation={drawingRotation}
                                    onMouseDown={() => handleMouseDown(x, y)}
                                    onMouseEnter={() => handleMouseEnter(x, y)}
                                    onMouseUp={handleMouseUp}
                                />
                            );
                        })
                    ))}
                </div>
            </div>
        </div>

      </div>
      
      {/* Victory Modal */}
      {gameState.winner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div 
                className="bg-white p-10 rounded-[3rem] shadow-[8px_8px_0_#000] border-4 border-black flex flex-col items-center max-w-xs w-full relative overflow-hidden"
                style={{ animation: 'jump-out 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' }}
            >
                {/* Visual Effects: Random Paw Prints Walking */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    {/* Background Paws with varied positions and rotations */}
                    <PawPrint size={32} className="absolute text-gray-200 top-[10%] left-[10%]" style={{ '--r': '12deg', animation: 'paw-walk 1.5s 0s infinite' } as any} />
                    <PawPrint size={24} className="absolute text-gray-200 top-[20%] right-[15%]" style={{ '--r': '-12deg', animation: 'paw-walk 1.5s 0.3s infinite' } as any} />
                    <PawPrint size={40} className="absolute text-gray-200 bottom-[20%] left-[20%]" style={{ '--r': '45deg', animation: 'paw-walk 1.5s 0.6s infinite' } as any} />
                    <PawPrint size={28} className="absolute text-gray-200 bottom-[10%] right-[30%]" style={{ '--r': '-6deg', animation: 'paw-walk 1.5s 0.9s infinite' } as any} />
                    <PawPrint size={36} className="absolute text-gray-200 top-[50%] left-[5%]" style={{ '--r': '20deg', animation: 'paw-walk 1.5s 0.4s infinite' } as any} />
                    <PawPrint size={30} className="absolute text-gray-200 top-[60%] right-[5%]" style={{ '--r': '-20deg', animation: 'paw-walk 1.5s 0.7s infinite' } as any} />
                </div>

                <div className={clsx(
                    "absolute -top-12 p-6 rounded-full shadow-[4px_4px_0_#000] border-4 border-black animate-cat-bounce z-10",
                    gameState.winner === 'black' ? "bg-black text-white" : "bg-white text-black"
                )}>
                    {/* Flashing Cat Avatar */}
                    <Cat size={64} />
                </div>
                
                <div className="mt-12 text-center w-full z-10">
                    <h2 className="text-3xl font-black mb-2 text-black uppercase tracking-tighter animate-bounce">
                        {gameState.winner === 'black' ? 'BLACK WINS' : 'WHITE WINS'}
                    </h2>
                    <p className="text-xs font-bold text-gray-500 mb-6 uppercase tracking-widest">
                        {gameState.winner === 'black' ? 'Meow Meow!' : 'Mew Mew!'}
                    </p>
                    <div className="flex justify-center gap-1 mb-6 text-black">
                        <Sparkles size={20} className="animate-pulse" />
                        <Sparkles size={16} className="animate-bounce" />
                        <Sparkles size={20} className="animate-pulse" />
                    </div>
                    <button 
                        onClick={() => resetGame(gameState.gameMode)}
                        className="w-full bg-black text-white font-bold py-3.5 rounded-2xl border-4 border-black hover:bg-gray-800 transition-colors uppercase tracking-wider text-sm shadow-[4px_4px_0_#666] active:translate-y-1 active:shadow-none"
                    >
                        Play Again
                    </button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};

export default App;
