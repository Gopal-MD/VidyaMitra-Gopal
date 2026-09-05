import React, { useRef, useState, useCallback, ReactNode } from 'react';

export interface BentoCardData {
  color?: string;
  title?: string;
  description?: string;
  label?: string;
  customContent?: ReactNode;
  onClick?: () => void;
}

interface MagicBentoProps {
  cards: BentoCardData[];
  textAutoHide?: boolean;
  enableStars?: boolean;
  enableSpotlight?: boolean;
  enableBorderGlow?: boolean;
  enableTilt?: boolean;
  enableMagnetism?: boolean;
  clickEffect?: boolean;
  spotlightRadius?: number;
  particleCount?: number;
  glowColor?: string;
  disableAnimations?: boolean;
  className?: string;
}

interface StarProps {
  style: React.CSSProperties;
}

function Star({ style }: StarProps) {
  return (
    <span
      className="absolute rounded-full bg-white pointer-events-none animate-pulse"
      style={style}
    />
  );
}

function generateStars(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    style: {
      width: `${Math.random() * 2 + 1}px`,
      height: `${Math.random() * 2 + 1}px`,
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      opacity: Math.random() * 0.6 + 0.2,
      animationDelay: `${Math.random() * 3}s`,
      animationDuration: `${Math.random() * 2 + 1.5}s`,
    } as React.CSSProperties,
  }));
}

function BentoCard({
  card,
  index,
  enableStars,
  enableSpotlight,
  enableBorderGlow,
  enableTilt,
  enableMagnetism,
  clickEffect,
  spotlightRadius,
  particleCount,
  glowColor,
  disableAnimations,
  textAutoHide,
}: {
  card: BentoCardData;
  index: number;
  enableStars?: boolean;
  enableSpotlight?: boolean;
  enableBorderGlow?: boolean;
  enableTilt?: boolean;
  enableMagnetism?: boolean;
  clickEffect?: boolean;
  spotlightRadius?: number;
  particleCount?: number;
  glowColor?: string;
  disableAnimations?: boolean;
  textAutoHide?: boolean;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [spotlight, setSpotlight] = useState({ x: 50, y: 50, active: false });
  const [clicked, setClicked] = useState(false);
  const [stars] = useState(() => generateStars(particleCount ?? 12));

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!cardRef.current || disableAnimations) return;
      const rect = cardRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      setSpotlight({ x, y, active: true });

      if (enableTilt) {
        const tiltX = ((y - 50) / 50) * 8;
        const tiltY = ((x - 50) / 50) * -8;
        cardRef.current.style.transform = `perspective(800px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale(1.02)`;
      }
    },
    [disableAnimations, enableTilt],
  );

  const handleMouseLeave = useCallback(() => {
    setSpotlight(prev => ({ ...prev, active: false }));
    if (cardRef.current && enableTilt) {
      cardRef.current.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg) scale(1)';
    }
  }, [enableTilt]);

  const handleClick = useCallback(() => {
    if (clickEffect && !disableAnimations) {
      setClicked(true);
      setTimeout(() => setClicked(false), 300);
    }
    card.onClick?.();
  }, [card, clickEffect, disableAnimations]);

  const radius = spotlightRadius ?? 350;
  const glow = glowColor ?? '132, 0, 255';
  const bg = card.color ?? '#060010';

  return (
    <div
      ref={cardRef}
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={[
        'relative overflow-hidden rounded-2xl cursor-pointer select-none',
        'transition-transform duration-200',
        enableBorderGlow ? 'border border-white/10' : 'border border-white/5',
        clicked ? 'scale-95' : '',
      ].join(' ')}
      style={{
        background: bg,
        minHeight: '220px',
        boxShadow: enableBorderGlow && spotlight.active
          ? `0 0 20px 2px rgba(${glow}, 0.35), inset 0 0 30px rgba(${glow}, 0.08)`
          : '0 4px 24px rgba(0,0,0,0.4)',
        willChange: enableTilt ? 'transform' : undefined,
        transitionProperty: 'transform, box-shadow',
      }}
    >
      {/* Stars */}
      {enableStars && (
        <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
          {stars.map(s => <Star key={s.id} style={s.style} />)}
        </div>
      )}

      {/* Spotlight */}
      {enableSpotlight && spotlight.active && (
        <div
          className="absolute inset-0 pointer-events-none rounded-2xl transition-opacity duration-200"
          style={{
            background: `radial-gradient(${radius}px circle at ${spotlight.x}% ${spotlight.y}%, rgba(${glow}, 0.18) 0%, transparent 70%)`,
          }}
        />
      )}

      {/* Content */}
      <div className="relative z-10 h-full p-4">
        {card.customContent ? (
          card.customContent
        ) : (
          <div className="flex flex-col h-full justify-between text-white">
            {card.label && (
              <span className="text-xs font-medium uppercase tracking-wider opacity-60">
                {card.label}
              </span>
            )}
            <div>
              {card.title && <h3 className="text-lg font-semibold">{card.title}</h3>}
              {card.description && !textAutoHide && (
                <p className="text-sm opacity-70 mt-1">{card.description}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Responsive bento layout: 1 col mobile, 2 col tablet, auto on desktop based on card count
const gridClass = (count: number) => {
  if (count === 1) return 'grid-cols-1';
  if (count === 2) return 'grid-cols-1 sm:grid-cols-2';
  if (count === 3) return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
  return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
};

export default function MagicBento({
  cards,
  textAutoHide,
  enableStars,
  enableSpotlight,
  enableBorderGlow,
  enableTilt,
  enableMagnetism,
  clickEffect,
  spotlightRadius,
  particleCount,
  glowColor,
  disableAnimations,
  className,
}: MagicBentoProps) {
  if (!cards || cards.length === 0) return null;

  return (
    <div className={`grid gap-4 ${gridClass(cards.length)} ${className ?? ''}`}>
      {cards.map((card, i) => (
        <BentoCard
          key={i}
          index={i}
          card={card}
          textAutoHide={textAutoHide}
          enableStars={enableStars}
          enableSpotlight={enableSpotlight}
          enableBorderGlow={enableBorderGlow}
          enableTilt={enableTilt}
          enableMagnetism={enableMagnetism}
          clickEffect={clickEffect}
          spotlightRadius={spotlightRadius}
          particleCount={particleCount}
          glowColor={glowColor}
          disableAnimations={disableAnimations}
        />
      ))}
    </div>
  );
}
