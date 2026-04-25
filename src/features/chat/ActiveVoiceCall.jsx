import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { LiveKitRoom, RoomAudioRenderer, useLocalParticipant } from '@livekit/components-react';
import { PhoneOff, Mic, MicOff, Volume2, User } from 'lucide-react';

export default function ActiveVoiceCall({ token, serverUrl, contact, onEnd }) {
  if (!token || !serverUrl) return null;

  const content = (
    <LiveKitRoom
      token={token}
      serverUrl={serverUrl}
      connect={true}
      audio={true}
      video={false}
      onDisconnected={onEnd}
      className="fixed inset-0 z-[99999] h-[100dvh] w-[100dvw] overflow-hidden"
      style={{
        background: "radial-gradient(120% 60% at 50% 0%, var(--color-accent) 0%, color-mix(in srgb, var(--color-accent) 70%, black) 55%, var(--color-surface) 100%)"
      }}
    >
      <CallUI contact={contact} onEnd={onEnd} />
      <RoomAudioRenderer />
    </LiveKitRoom>
  );

  return createPortal(content, document.body);
}

function CallUI({ contact, onEnd }) {
  const { localParticipant, isMicrophoneEnabled } = useLocalParticipant();
  const [isSpeaker, setIsSpeaker] = useState(true);
  const [duration, setDuration] = useState(0);
  const [optimisticMute, setOptimisticMute] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => setDuration(d => d + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const toggleMute = async () => {
    if (localParticipant) {
      const nextState = !(optimisticMute ?? !isMicrophoneEnabled);
      setOptimisticMute(nextState);
      try {
        await localParticipant.setMicrophoneEnabled(!nextState);
      } catch (err) {
        console.error("Failed to toggle mute:", err);
      } finally {
        setTimeout(() => setOptimisticMute(null), 500);
      }
    }
  };

  const toggleSpeaker = () => {
    setIsSpeaker(!isSpeaker);
    // Note: LiveKit web doesn't easily let you select output device (speaker vs earpiece) 
    // without advanced device management. We toggle the UI state for now.
  };

  const isMuted = optimisticMute ?? !isMicrophoneEnabled;

  return (
    <div className="relative flex h-full w-full flex-col text-white pt-safe pb-safe justify-between">
      
      {/* Top Info */}
      <div className="px-6 pt-8 md:pt-12 text-center z-10 shrink-0">
        <p className="text-[10px] sm:text-xs uppercase tracking-[0.28em] opacity-60 font-medium">ChatFlow voice</p>
        <p className="mt-2 sm:mt-3 text-2xl sm:text-3xl font-semibold tracking-[-0.03em] drop-shadow-md">{contact?.displayName || 'Unknown'}</p>
        <p className="mt-1 sm:mt-2 text-[10px] sm:text-xs opacity-60 font-medium">end-to-end encrypted · LiveKit</p>
      </div>

      {/* Center Avatar & Ping */}
      <div className="relative flex-1 flex flex-col items-center justify-center z-10 py-4 min-h-[200px]">
        <div className="relative grid h-32 w-32 sm:h-48 sm:w-48 place-items-center">
          <span className="absolute h-40 w-40 sm:h-56 sm:w-56 animate-ping rounded-full bg-white/5 duration-1000" />
          <span className="absolute h-32 w-32 sm:h-44 sm:w-44 animate-pulse rounded-full bg-white/10 duration-700" />
          
          <div className="relative h-28 w-28 sm:h-40 sm:w-40 overflow-hidden rounded-full shadow-2xl ring-4 ring-black/10" style={{ backgroundColor: 'var(--color-surface)' }}>
            {contact?.avatar ? (
              <img src={contact.avatar} className="w-full h-full object-cover" alt="" />
            ) : (
              <div 
                className="grid h-full w-full place-items-center text-4xl sm:text-6xl font-semibold text-white"
                style={{ background: 'linear-gradient(135deg, var(--color-accent), var(--color-primary))' }}
              >
                {contact?.displayName?.[0] || <User className="w-10 h-10 sm:w-14 sm:h-14" />}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Waveform & Timer */}
      <div className="px-6 z-10 shrink-0">
        <p className="text-center text-xs sm:text-sm font-medium opacity-70 tracking-widest tabular-nums">{formatTime(duration)}</p>
        <div className="mt-3 sm:mt-4 flex items-end justify-center gap-1 sm:gap-1.5 h-10 sm:h-12">
          {[14, 28, 16, 36, 18, 42, 24, 32, 14, 22].map((h, i) => (
            <span
              key={i}
              className="w-1 sm:w-1.5 rounded-full animate-pulse"
              style={{ 
                height: `calc(${h}px * 0.8)`, 
                animationDelay: `${i * 150}ms`,
                backgroundColor: 'var(--color-accent)',
                boxShadow: '0 0 8px color-mix(in srgb, var(--color-accent) 60%, transparent)'
              }}
            />
          ))}
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="mt-6 mb-4 sm:mb-10 flex items-center justify-center gap-6 sm:gap-10 w-full max-w-md mx-auto z-10 shrink-0">
        <div className="flex flex-col items-center gap-2">
          <button 
            onClick={toggleMute} 
            className={`grid h-14 w-14 sm:h-16 sm:w-16 place-items-center rounded-full transition-all active:scale-95 shadow-xl ${isMuted ? 'bg-white text-[#0B141A]' : 'bg-white/10 text-white hover:bg-white/20'}`}
          >
            {isMuted ? <MicOff className="h-6 w-6 sm:h-7 sm:w-7" /> : <Mic className="h-6 w-6 sm:h-7 sm:w-7" />}
          </button>
          <span className="text-[10px] uppercase tracking-widest font-bold opacity-60">Mute</span>
        </div>
        
        <div className="flex flex-col items-center gap-2">
          <button 
            onClick={onEnd} 
            className="grid h-16 w-16 sm:h-20 sm:w-20 place-items-center rounded-full bg-[#FF4B4B] text-white transition-all hover:bg-rose-600 active:scale-95 shadow-[0_0_30px_rgba(255,75,75,0.4)]"
          >
            <PhoneOff className="h-8 w-8 sm:h-10 sm:w-10" />
          </button>
          <span className="text-[10px] uppercase tracking-widest font-bold opacity-60">End</span>
        </div>

        <div className="flex flex-col items-center gap-2">
          <button 
            onClick={toggleSpeaker}
            className={`grid h-14 w-14 sm:h-16 sm:w-16 place-items-center rounded-full transition-all active:scale-95 shadow-xl ${!isSpeaker ? 'bg-white text-[#0B141A]' : 'bg-white/10 text-white hover:bg-white/20'}`}
          >
            <Volume2 className="h-6 w-6 sm:h-7 sm:w-7" />
          </button>
          <span className="text-[10px] uppercase tracking-widest font-bold opacity-60">Speaker</span>
        </div>
      </div>

    </div>
  );
}