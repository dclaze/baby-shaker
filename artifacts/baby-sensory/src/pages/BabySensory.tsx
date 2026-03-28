import { useEffect, useRef, useCallback, useState } from "react";

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  shape: "circle" | "star" | "heart" | "triangle";
  size: number;
  opacity: number;
  vx: number;
  vy: number;
  born: number;
  lifetime: number;
}

interface Ripple {
  id: number;
  x: number;
  y: number;
  color: string;
  born: number;
}

const BABY_COLORS = [
  "#FF8FAB", "#FFB347", "#FDFD96", "#77DD77", "#AEC6CF",
  "#C3A6FF", "#FF9AA2", "#FFDAC1", "#E2F0CB", "#B5EAD7",
  "#C7CEEA", "#F8BBD0", "#FFE0B2", "#B2DFDB", "#D1C4E9",
];

const SHAPES: Particle["shape"][] = ["circle", "star", "heart", "triangle"];

let nextId = 1;

function getRandomColor() {
  return BABY_COLORS[Math.floor(Math.random() * BABY_COLORS.length)];
}

function getRandomShape(): Particle["shape"] {
  return SHAPES[Math.floor(Math.random() * SHAPES.length)];
}

function ShapeElement({ particle }: { particle: Particle }) {
  const age = Date.now() - particle.born;
  const progress = Math.min(age / particle.lifetime, 1);
  const opacity = particle.opacity * (1 - progress);
  const scale = 0.3 + 0.7 * Math.sin(progress * Math.PI);
  const x = particle.x + particle.vx * age * 0.001 * 80;
  const y = particle.y + particle.vy * age * 0.001 * 80 + 0.5 * 60 * (age * 0.001) ** 2;
  const rotation = progress * 360 * (particle.vx > 0 ? 1 : -1);

  if (particle.shape === "circle") {
    return (
      <div
        style={{
          position: "absolute",
          left: x - particle.size / 2,
          top: y - particle.size / 2,
          width: particle.size,
          height: particle.size,
          borderRadius: "50%",
          backgroundColor: particle.color,
          opacity,
          transform: `scale(${scale}) rotate(${rotation}deg)`,
          pointerEvents: "none",
          willChange: "transform, opacity",
        }}
      />
    );
  }

  if (particle.shape === "star") {
    return (
      <div
        style={{
          position: "absolute",
          left: x - particle.size / 2,
          top: y - particle.size / 2,
          width: particle.size,
          height: particle.size,
          opacity,
          transform: `scale(${scale}) rotate(${rotation}deg)`,
          pointerEvents: "none",
          willChange: "transform, opacity",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: particle.size,
          lineHeight: 1,
          color: particle.color,
        }}
      >
        ★
      </div>
    );
  }

  if (particle.shape === "heart") {
    return (
      <div
        style={{
          position: "absolute",
          left: x - particle.size / 2,
          top: y - particle.size / 2,
          width: particle.size,
          height: particle.size,
          opacity,
          transform: `scale(${scale}) rotate(${rotation}deg)`,
          pointerEvents: "none",
          willChange: "transform, opacity",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: particle.size,
          lineHeight: 1,
          color: particle.color,
        }}
      >
        ♥
      </div>
    );
  }

  // triangle
  return (
    <div
      style={{
        position: "absolute",
        left: x - particle.size / 2,
        top: y - particle.size / 2,
        width: 0,
        height: 0,
        borderLeft: `${particle.size / 2}px solid transparent`,
        borderRight: `${particle.size / 2}px solid transparent`,
        borderBottom: `${particle.size * 0.866}px solid ${particle.color}`,
        opacity,
        transform: `scale(${scale}) rotate(${rotation}deg)`,
        pointerEvents: "none",
        willChange: "transform, opacity",
      }}
    />
  );
}

function RippleElement({ ripple }: { ripple: Ripple }) {
  const age = Date.now() - ripple.born;
  const progress = Math.min(age / 600, 1);
  const size = 40 + 140 * progress;
  const opacity = 0.5 * (1 - progress);

  return (
    <div
      style={{
        position: "absolute",
        left: ripple.x - size / 2,
        top: ripple.y - size / 2,
        width: size,
        height: size,
        borderRadius: "50%",
        border: `3px solid ${ripple.color}`,
        opacity,
        pointerEvents: "none",
        willChange: "transform, opacity",
      }}
    />
  );
}

function FloatingBubble({ index }: { index: number }) {
  const color = BABY_COLORS[index % BABY_COLORS.length];
  const size = 30 + (index * 17) % 40;
  const left = 5 + (index * 137) % 90;
  const duration = 8 + (index * 3) % 10;
  const delay = (index * 1.3) % 8;

  return (
    <div
      style={{
        position: "absolute",
        bottom: -size,
        left: `${left}%`,
        width: size,
        height: size,
        borderRadius: "50%",
        backgroundColor: color,
        opacity: 0.15,
        animation: `float ${duration}s ${delay}s infinite ease-in-out`,
        pointerEvents: "none",
      }}
    />
  );
}

const NOTES = [261.63, 293.66, 329.63, 349.23, 392.0, 440.0, 493.88, 523.25];

function playNote(audioCtx: AudioContext, frequency: number) {
  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(frequency, audioCtx.currentTime);

  gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.12, audioCtx.currentTime + 0.05);
  gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.8);

  oscillator.start(audioCtx.currentTime);
  oscillator.stop(audioCtx.currentTime + 0.8);
}

export default function BabySensory() {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const [background, setBackground] = useState(0);
  const [isLocked, setIsLocked] = useState(true);
  const [showUnlockHint, setShowUnlockHint] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressStartRef = useRef(false);
  const animFrameRef = useRef<number>(0);
  const noteIndexRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const backgrounds = [
    "radial-gradient(ellipse at 30% 20%, #1a0533 0%, #0d1b4d 50%, #001a33 100%)",
    "radial-gradient(ellipse at 70% 30%, #1a2500 0%, #002233 50%, #1a0022 100%)",
    "radial-gradient(ellipse at 50% 80%, #220033 0%, #001a22 50%, #002200 100%)",
    "radial-gradient(ellipse at 20% 70%, #002244 0%, #220000 50%, #001122 100%)",
  ];

  const getAudioContext = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }
    if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  const spawnParticles = useCallback((x: number, y: number) => {
    const count = 5 + Math.floor(Math.random() * 5);
    const color = getRandomColor();
    const now = Date.now();
    const newParticles: Particle[] = [];

    for (let i = 0; i < count; i++) {
      const angle = (Math.random() * Math.PI * 2);
      const speed = 1 + Math.random() * 3;
      newParticles.push({
        id: nextId++,
        x,
        y,
        color: i % 3 === 0 ? getRandomColor() : color,
        shape: getRandomShape(),
        size: 24 + Math.random() * 40,
        opacity: 0.7 + Math.random() * 0.3,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        born: now,
        lifetime: 900 + Math.random() * 600,
      });
    }

    const newRipple: Ripple = {
      id: nextId++,
      x,
      y,
      color,
      born: now,
    };

    setParticles(prev => [...prev.slice(-60), ...newParticles]);
    setRipples(prev => [...prev.slice(-20), newRipple]);

    const audioCtx = getAudioContext();
    const note = NOTES[noteIndexRef.current % NOTES.length];
    noteIndexRef.current++;
    playNote(audioCtx, note);

    setBackground(b => (b + 1) % backgrounds.length);
  }, [getAudioContext, backgrounds.length]);

  useEffect(() => {
    let animId: number;
    const animate = () => {
      const now = Date.now();
      setParticles(prev => prev.filter(p => now - p.born < p.lifetime + 100));
      setRipples(prev => prev.filter(r => now - r.born < 700));
      animId = requestAnimationFrame(animate);
    };
    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    const x = e.clientX;
    const y = e.clientY;

    spawnParticles(x, y);

    if (!isLocked) return;

    longPressStartRef.current = true;
    longPressTimerRef.current = setTimeout(() => {
      if (longPressStartRef.current) {
        setShowUnlockHint(true);
        tapCountRef.current = 0;
      }
    }, 2000);
  }, [spawnParticles, isLocked]);

  const handlePointerUp = useCallback(() => {
    longPressStartRef.current = false;
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }

    if (showUnlockHint) {
      tapCountRef.current++;
      if (tapCountRef.current >= 3) {
        setIsLocked(false);
        setShowUnlockHint(false);
        tapCountRef.current = 0;
      }
      if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
      tapTimerRef.current = setTimeout(() => {
        tapCountRef.current = 0;
        setShowUnlockHint(false);
      }, 3000);
    }
  }, [showUnlockHint]);

  const handleLock = useCallback(() => {
    setIsLocked(true);
    setShowUnlockHint(false);
    tapCountRef.current = 0;
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: "fixed",
        inset: 0,
        background: backgrounds[background],
        transition: "background 0.8s ease",
        overflow: "hidden",
        userSelect: "none",
        WebkitUserSelect: "none",
        touchAction: "none",
        cursor: isLocked ? "none" : "default",
      }}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onContextMenu={e => e.preventDefault()}
    >
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) scale(1); }
          33% { transform: translateY(-40vh) scale(1.1); }
          66% { transform: translateY(-20vh) scale(0.9); }
        }
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.05); }
        }
        @keyframes shimmer {
          0% { opacity: 0.4; }
          50% { opacity: 0.8; }
          100% { opacity: 0.4; }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      {Array.from({ length: 12 }, (_, i) => (
        <FloatingBubble key={i} index={i} />
      ))}

      {ripples.map(ripple => (
        <RippleElement key={ripple.id} ripple={ripple} />
      ))}

      {particles.map(particle => (
        <ShapeElement key={particle.id} particle={particle} />
      ))}

      {/* Central decoration — slow spinning star */}
      {isLocked && particles.length === 0 && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            textAlign: "center",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              fontSize: 100,
              animation: "spin-slow 12s linear infinite",
              display: "inline-block",
              opacity: 0.25,
            }}
          >
            ✦
          </div>
          <p
            style={{
              color: "rgba(255,255,255,0.25)",
              fontSize: 16,
              marginTop: 8,
              fontFamily: "sans-serif",
              letterSpacing: 2,
            }}
          >
            TAP ANYWHERE
          </p>
        </div>
      )}

      {/* Unlock hint overlay */}
      {showUnlockHint && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.7)",
            zIndex: 999,
            fontFamily: "sans-serif",
          }}
          onPointerDown={e => e.stopPropagation()}
          onPointerUp={e => {
            e.stopPropagation();
            tapCountRef.current++;
            if (tapCountRef.current >= 3) {
              setIsLocked(false);
              setShowUnlockHint(false);
              tapCountRef.current = 0;
            }
          }}
        >
          <p style={{ color: "white", fontSize: 24, marginBottom: 16 }}>
            Tap 3 times to unlock
          </p>
          <div style={{ display: "flex", gap: 12 }}>
            {[0, 1, 2].map(i => (
              <div
                key={i}
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  background: i < tapCountRef.current ? "#77DD77" : "rgba(255,255,255,0.3)",
                  border: "2px solid white",
                  transition: "background 0.2s",
                }}
              />
            ))}
          </div>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, marginTop: 20 }}>
            Hold for 2 seconds, then tap 3 times
          </p>
        </div>
      )}

      {/* Unlocked control bar */}
      {!isLocked && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            gap: 12,
            zIndex: 100,
            background: "rgba(0,0,0,0.5)",
            borderRadius: 50,
            padding: "10px 24px",
            backdropFilter: "blur(8px)",
          }}
          onPointerDown={e => e.stopPropagation()}
        >
          <span style={{ color: "white", fontFamily: "sans-serif", fontSize: 14, alignSelf: "center" }}>
            Baby Sensory
          </span>
          <button
            onClick={handleLock}
            style={{
              background: "#FF8FAB",
              color: "white",
              border: "none",
              borderRadius: 20,
              padding: "8px 18px",
              fontFamily: "sans-serif",
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Lock Screen
          </button>
        </div>
      )}
    </div>
  );
}
