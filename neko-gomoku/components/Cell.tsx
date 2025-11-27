
import React, { useEffect, useState } from 'react';
import { Player, CellData } from '../types';
import clsx from 'clsx';
import { PawPrint } from 'lucide-react';

interface CellProps {
  x: number;
  y: number;
  data: CellData | null;
  // Drawing props
  isDrawing: boolean;
  drawingPlayer: Player | null;
  drawingRotation: number; // Rotation if currently being drawn
  
  onMouseDown: () => void;
  onMouseEnter: () => void;
  onMouseUp: () => void;
}

const Cell: React.FC<CellProps> = ({
  data,
  isDrawing,
  drawingPlayer,
  drawingRotation,
  onMouseDown,
  onMouseEnter,
  onMouseUp
}) => {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (data) {
      setAnimate(true);
      const timer = setTimeout(() => setAnimate(false), 600);
      return () => clearTimeout(timer);
    }
  }, [data]);

  const effectivePlayer = data?.player || (isDrawing ? drawingPlayer : null);
  const rotation = isDrawing ? drawingRotation : (data?.rotation || 0);

  // Black & White Theme: White tile, subtle gray border/shadow
  const tileClass = 'bg-white rounded-2xl shadow-[0_4px_0_#d4d4d4] active:shadow-none active:translate-y-[4px] transition-all duration-75';

  return (
    <div
      className={clsx(
        "relative flex items-center justify-center select-none cursor-pointer aspect-square",
        tileClass
      )}
      onMouseDown={onMouseDown}
      onMouseEnter={onMouseEnter}
      onMouseUp={onMouseUp}
    >
        {/* Mud Splash Animation Elements (Dark Gray/Black) */}
        {animate && (
            <>
                {/* Mud Ring */}
                <div className="absolute w-full h-full animate-splash-ring border-4 border-neutral-700 rounded-full opacity-0 pointer-events-none" />
                
                {/* Mud Particles (Blobs) */}
                <div className="absolute top-0 left-1/2 w-2 h-2 bg-neutral-800 rounded-full animate-splash-particle-1 pointer-events-none" />
                <div className="absolute top-1/2 right-0 w-1.5 h-1.5 bg-neutral-600 rounded-full animate-splash-particle-2 pointer-events-none" />
                <div className="absolute bottom-0 left-1/2 w-2 h-2 bg-neutral-800 rounded-full animate-splash-particle-3 pointer-events-none" />
                <div className="absolute top-1/2 left-0 w-1.5 h-1.5 bg-neutral-600 rounded-full animate-splash-particle-4 pointer-events-none" />
            </>
        )}

        {/* The Piece (Paw Print) Overlay */}
        <div 
            className={clsx(
                "absolute inset-0 flex items-center justify-center pointer-events-none",
                (animate || isDrawing) && "animate-jelly"
            )}
        >
            {effectivePlayer && (
                <div 
                    style={{ transform: `rotate(${rotation}deg)` }}
                    className={clsx(
                        "transition-transform duration-300",
                        effectivePlayer === 'black' 
                            ? "text-black drop-shadow-[0_2px_0_rgba(0,0,0,0.1)]" 
                            : "text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] stroke-[3px] stroke-black" 
                    )}
                >
                    <PawPrint 
                        size={22} 
                        strokeWidth={effectivePlayer === 'white' ? 3 : 0} 
                        stroke={effectivePlayer === 'white' ? "black" : "none"} 
                        fill="currentColor" 
                    />
                </div>
            )}
        </div>
    </div>
  );
};

export default React.memo(Cell);
