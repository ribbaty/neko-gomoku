
import React from 'react';
import { Player } from '../types';
import clsx from 'clsx';
import { PawPrint } from 'lucide-react';

interface ShapePreviewProps {
  length: number;
  player: Player;
}

const ShapePreview: React.FC<ShapePreviewProps> = ({ length, player }) => {
  return (
    <div className="flex flex-col items-center gap-1 w-full">
      <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
        SHAPE
      </div>
      
      <div className="flex items-center justify-center w-full">
        <div className="flex gap-2"> 
          {Array.from({ length: 3 }).map((_, i) => {
              const active = i < length;
              const isBlack = player === 'black';

              return (
                <div 
                    key={i} 
                    className={clsx(
                        "w-8 h-8 flex items-center justify-center rounded-xl shadow-[0_3px_0_#d4d4d4]",
                        "bg-white",
                        !active && "opacity-30 shadow-none bg-gray-100 border border-gray-200"
                    )}
                >
                    {active && (
                         <div className={clsx(
                            isBlack 
                                ? "text-black" 
                                : "text-white stroke-[3px] stroke-black"
                         )}>
                             <PawPrint 
                                size={18} 
                                strokeWidth={isBlack ? 0 : 3} 
                                stroke={isBlack ? "none" : "black"} 
                                fill="currentColor" 
                             />
                         </div>
                    )}
                </div>
              );
          })}
        </div>
      </div>
    </div>
  );
};

export default ShapePreview;
