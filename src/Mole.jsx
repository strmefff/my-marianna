import { useEffect, useState } from 'react';
import { sfx } from './sound';

/**
 * Pixel-art frame animation for Кротик.
 * Files: public/mole/<anim>_1.png ... <anim>_<frames>.png  (64x64, transparent)
 * Example: <Mole anim="idle" frames={4} fps={5} scale={5} />
 */
export const MOLE_SIZE = 64;

export default function Mole({ anim = 'idle', frames = 4, fps = 5, scale = 5 }) {
  const [i, setI] = useState(0);
  const [bump, setBump] = useState(0);

  // preload so there is no flicker between frames
  useEffect(() => {
    for (let n = 1; n <= frames; n++) {
      const img = new Image();
      img.src = `${import.meta.env.BASE_URL}mole/${anim}_${n}.png`;
    }
    setI(0);
  }, [anim, frames]);

  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % frames), 1000 / fps);
    return () => clearInterval(t);
  }, [frames, fps]);

  const size = MOLE_SIZE * scale;
  const poke = () => { sfx.poke(); setBump((b) => b + 1); };
  return (
    <div key={bump} onPointerDown={poke} style={{ display: 'inline-block', cursor: 'pointer', touchAction: 'manipulation', animation: bump ? 'hit .3s' : 'none' }}>
      <img
        src={`${import.meta.env.BASE_URL}mole/${anim}_${i + 1}.png`}
        width={size}
        height={size}
        alt="Кротик"
        draggable={false}
        style={{ imageRendering: 'pixelated', width: size, height: size }}
      />
    </div>
  );
}
