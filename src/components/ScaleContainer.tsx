import React, { useEffect, useMemo, useState } from 'react';

interface ScaleContainerProps {
  baseWidth?: number;
  baseHeight?: number;
  minScale?: number;
  maxScale?: number;
  children: React.ReactNode;
}

// Scales the entire app according to window size while preserving aspect
const ScaleContainer: React.FC<ScaleContainerProps> = ({
  baseWidth = 1440,
  baseHeight = 900,
  minScale = 0.6,
  maxScale = 1.2,
  children,
}) => {
  const computeScale = (): number => {
    const scaleX = window.innerWidth / baseWidth;
    const scaleY = window.innerHeight / baseHeight;
    const scale = Math.min(scaleX, scaleY);
    return Math.max(minScale, Math.min(maxScale, scale));
  };

  const [scale, setScale] = useState<number>(() => computeScale());

  useEffect(() => {
    let raf = 0;
    const onResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setScale(computeScale()));
    };
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  const containerStyle = useMemo<React.CSSProperties>(() => ({
    transform: `scale(${scale})`,
    transformOrigin: 'top left',
    width: `${(100 / scale).toFixed(4)}%`,
    height: `${(100 / scale).toFixed(4)}%`,
  }), [scale]);

  return (
    <div className="scale-container">
      <div style={containerStyle}>
        {children}
      </div>
    </div>
  );
};

export default ScaleContainer;


