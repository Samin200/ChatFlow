import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { PhoneOff, Mic, MicOff, Volume2, User, Lock } from 'lucide-react';

export default function OutgoingCallModal({ contact, isVideo, onEnd }) {
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    console.log('[OutgoingCall] Rendering for:', contact?.displayName);
    const timer = setInterval(() => setDuration(d => d + 1), 1000);
    return () => clearInterval(timer);
  }, [contact]);

  const formatTime = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const content = (
    <div 
      className="fixed inset-0 z-[99999] h-[100dvh] w-[100dvw] overflow-hidden flex flex-col text-white pt-safe pb-safe"
      style={{
        background: "radial-gradient(120% 60% at 50% 0%, var(--color-accent) 0%, color-mix(in srgb, var(--color-accent) 70%, black) 55%, var(--color-surface) 100%)"
      }}
    >
      {/* Top Info */}
      <div className="px-6 pt-10 text-center z-10 shrink-0">
        <p className="text-xs uppercase tracking-[0.28em] text-white/60 font-medium">ChatFlow {isVideo ? 'video' : 'voice'}</p>
        <p className="mt-3 text-3xl font-semibold tracking-[-0.03em] drop-shadow-md">{contact?.displayName || 'Unknown'}</p>
        <p className="mt-2 text-xs text-white/60 font-medium flex items-center justify-center gap-1">
          <Lock size={12} className="opacity-70" /> calling...
        </p>
      </div>

      {/* Center Avatar & Ping */}
      <div className="relative flex-1 flex flex-col items-center justify-center z-10 py-4 min-h-[200px]">
        <div className="relative grid h-40 w-40 md:h-48 md:w-48 place-items-center">
          <span className="absolute h-full w-full animate-ping rounded-full bg-white/10 duration-1000" />
          <span className="absolute h-3/4 w-3/4 animate-pulse rounded-full bg-white/15 duration-700" />
          
          <div className="relative h-3/4 w-3/4 overflow-hidden rounded-full shadow-2xl ring-4 ring-black/10" style={{ backgroundColor: 'var(--color-surface)' }}>
            {contact?.avatar ? (
              <img src={contact.avatar} className="w-full h-full object-cover" alt="" />
            ) : (
              <div 
                className="grid h-full w-full place-items-center text-5xl font-semibold text-white"
                style={{ background: 'linear-gradient(135deg, var(--color-accent), var(--color-primary))' }}
              >
                {contact?.displayName?.[0] || <User size={56} />}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Timer & Status */}
      <div className="px-6 z-10 shrink-0">
        <p className="text-center text-sm font-medium text-white/70 tracking-widest tabular-nums">00:00</p>
        <div className="mt-4 flex items-end justify-center gap-1.5 h-12">
          {[14, 28, 16, 36, 18, 42, 24, 32, 14, 22].map((h, i) => (
            <span
              key={i}
              className="w-1.5 rounded-full bg-[var(--color-accent)] animate-pulse shadow-[0_0_8px_color-mix(in srgb, var(--color-accent) 60%, transparent)]"
              style={{ height: h, animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="mt-8 mb-10 flex items-center justify-center gap-10 w-full max-w-md mx-auto z-10 shrink-0">
        <div className="flex flex-col items-center gap-2">
          <button className="grid h-16 w-16 place-items-center rounded-full bg-white/10 text-white transition-all hover:bg-white/20 active:scale-95 shadow-xl">
            <MicOff className="h-7 w-7" />
          </button>
          <span className="text-[10px] uppercase tracking-widest font-bold opacity-60">Mute</span>
        </div>
        
        <div className="flex flex-col items-center gap-2">
          <button 
            onClick={onEnd} 
            className="grid h-20 w-20 place-items-center rounded-full bg-[#FF4B4B] text-white transition-all hover:bg-rose-600 active:scale-95 shadow-[0_0_30px_rgba(255,75,75,0.4)]"
          >
            <PhoneOff className="h-10 w-10" />
          </button>
          <span className="text-[10px] uppercase tracking-widest font-bold opacity-60">End</span>
        </div>

        <div className="flex flex-col items-center gap-2">
          <button className="grid h-16 w-16 place-items-center rounded-full bg-white/10 text-white transition-all hover:bg-white/20 active:scale-95 shadow-xl">
            <Volume2 className="h-7 w-7" />
          </button>
          <span className="text-[10px] uppercase tracking-widest font-bold opacity-60">Speaker</span>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
