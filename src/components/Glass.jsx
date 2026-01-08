import React, { useRef } from 'react';
import './glass.css';

export default function Glass({ children, className = '', style = {} }) {
  const ref = useRef(null);
  const supportsFinePointer = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(pointer: fine)').matches;

  const handlePointer = (e) => {
    const el = ref.current;
    if (!el || !supportsFinePointer) return;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    el.style.setProperty('--sheen-x', `${x}%`);
    el.style.setProperty('--sheen-y', `${y}%`);
    el.style.setProperty('--tilt-x', `${(x - 50) / 50}`);
    el.style.setProperty('--tilt-y', `${(y - 50) / 50}`);
  };

  const resetPointer = () => {
    const el = ref.current; if (!el) return;
    el.style.setProperty('--sheen-x', `-20%`);
    el.style.setProperty('--sheen-y', `-10%`);
    el.style.setProperty('--tilt-x', `0`);
    el.style.setProperty('--tilt-y', `0`);
  };

  return (
    <div ref={ref} data-filter={supportsFinePointer ? 'on' : 'off'} onPointerMove={handlePointer} onPointerLeave={resetPointer} className={`glass ${className}`} style={style}>
      {/* SVG filter for subtle refraction */}
      <svg className="sr-only" width="0" height="0" aria-hidden="true">
        <filter id="glassRefraction">
          {/* smoother turbulence + light gaussian blur for less harsh artifacts */}
          <feTurbulence baseFrequency="0.02" numOctaves="2" seed="3" type="fractalNoise" />
          <feGaussianBlur stdDeviation="0.6" />
          <feDisplacementMap in="SourceGraphic" scale="2" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>

      {/* inner chrome / edge highlight */}
      <div className="glass-edge" aria-hidden />

      {/* dynamic sheen */}
      <div className="glass-sheen" aria-hidden />

      {/* content */}
      <div className="glass-body">{children}</div>
    </div>
  );
}
