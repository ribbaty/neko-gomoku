// =========================================================================
// 👇 AUDIO URLS 👇
// =========================================================================

// 1. Keyboard/Click Sound URL
const KEYBOARD_URL = 'https://raw.githubusercontent.com/ribbaty/neko-gomoku/927d49952fd431641ecf6df1f668aa7c64b0695c/jianpan.mp3'; 

// 2. Victory/Meow Sound URL
const VICTORY_URL = 'https://raw.githubusercontent.com/ribbaty/neko-gomoku/1d77a598c44a84991082a2b953a1b8b82f5a76c9/miao.mp3';

// =========================================================================

// Simple audio context wrapper to unlock audio on some browsers
let audioCtx: AudioContext | null = null;

const getCtx = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioCtx;
};

// Initialize Audio objects
const SOUNDS = {
  click: new Audio(KEYBOARD_URL), 
  win: new Audio(VICTORY_URL),
};

// Configure basic settings
SOUNDS.click.volume = 0.6; 
SOUNDS.win.volume = 1.0;   

// Preload sounds
Object.values(SOUNDS).forEach(audio => {
    audio.load();
});

/**
 * Plays a sound file.
 * @param type The type of sound event
 * @param count Optional: number of times to play the click sound (for multi-block placement)
 */
export const playSound = (
    type: 'pop' | 'place' | 'error' | 'win-black' | 'win-white' | 'undo' | 'splash',
    count: number = 1
) => {
  try {
    // Ensure AudioContext is resumed (browser requirement for timing/unlocking)
    const ctx = getCtx();
    if (ctx.state === 'suspended') ctx.resume();

    switch (type) {
      case 'pop':
      case 'place':
      case 'splash':
      case 'undo': 
        // Play "jianpan" sound 'count' times with slight delay
        const playCount = count > 0 ? count : 1;
        
        for (let i = 0; i < playCount; i++) {
            setTimeout(() => {
                // Clone node allows overlapping sounds (rapid typing effect)
                const clone = SOUNDS.click.cloneNode() as HTMLAudioElement;
                // Add slight randomness to volume for realism
                clone.volume = Math.max(0.2, Math.min(1, SOUNDS.click.volume + (Math.random() * 0.2 - 0.1)));
                
                const playPromise = clone.play();
                if (playPromise !== undefined) {
                    playPromise.catch(e => console.warn("Click sound blocked or failed:", e));
                }
            }, i * 80); // 80ms delay between each "keystroke"
        }
        break;

      case 'win-black':
      case 'win-white':
        // Play victory sound
        const winClone = SOUNDS.win.cloneNode() as HTMLAudioElement;
        const winPromise = winClone.play();
        if (winPromise !== undefined) {
            winPromise.catch(e => console.warn("Win sound blocked or failed:", e));
        }
        break;
        
      case 'error':
         // Optional: Error sound
         break;
    }

  } catch (e) {
    console.error("Audio playback logic failed", e);
  }
};
