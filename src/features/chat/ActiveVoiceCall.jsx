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
        background: "radial-gradient(120% 60% at 50% 0%, #128C7E 0%, #075E54 55%, #0B141A 100%)"
      }}
    >
      <CallUI contact={contact} onEnd={onEnd} />
      <RoomAudioRenderer />
    </LiveKitRoom>
  );

  return createPortal(content, document.body);
}

function CallUI({ contact, onEnd }) {
  const [isMuted, setIsMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const { localParticipant } = useLocalParticipant();

  useEffect(() => {
    const timer = setInterval(() => setDuration(d => d + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const toggleMute = () => {
    if (localParticipant) {
      localParticipant.setMicrophoneEnabled(!isMuted);
      setIsMuted(!isMuted);
    }
  };

  return (
    <div className="relative flex h-full w-full flex-col text-white pt-safe pb-safe">
      
      {/* Top Info */}
      <div className="px-6 pt-10 text-center z-10">
        <p className="text-xs uppercase tracking-[0.28em] text-white/60 font-medium">ChatFlow voice</p>
        <p className="mt-3 text-3xl font-semibold tracking-[-0.03em] drop-shadow-md">{contact?.displayName || 'Unknown'}</p>
        <p className="mt-2 text-xs text-white/60 font-medium">end-to-end encrypted · LiveKit</p>
      </div>

      {/* Center Avatar & Ping */}
      <div className="relative flex-1 flex flex-col items-center justify-center z-10">
        <div className="relative grid h-48 w-48 place-items-center">
          <span className="absolute h-48 w-48 animate-ping rounded-full bg-white/10 duration-1000" />
          <span className="absolute h-36 w-36 animate-pulse rounded-full bg-white/15 duration-700" />
          
          <div className="relative h-36 w-36 overflow-hidden rounded-full shadow-2xl ring-4 ring-black/10">
            {contact?.avatar ? (
              <img src={contact.avatar} className="w-full h-full object-cover" alt="" />
            ) : (
              <div className="grid h-full w-full place-items-center bg-gradient-to-br from-[#25D366] to-[#128C7E] text-5xl font-semibold text-white">
                {contact?.displayName?.[0] || <User size={56} />}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Waveform & Timer */}
      <div className="mt-auto px-6 z-10">
        <p className="text-center text-sm font-medium text-white/70 tracking-widest tabular-nums">{formatTime(duration)}</p>
        <div className="mt-4 flex items-end justify-center gap-1.5 h-12">
          {[14, 28, 16, 36, 18, 42, 24, 32, 14, 22].map((h, i) => (
            <span
              key={i}
              className="w-1.5 rounded-full bg-[#25D366] animate-pulse shadow-[0_0_8px_rgba(37,211,102,0.6)]"
              style={{ height: h, animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="mt-8 mb-8 grid grid-cols-3 gap-6 px-10 place-items-center w-full max-w-md mx-auto z-10">
        <button 
          onClick={toggleMute} 
          className={`grid h-16 w-16 place-items-center rounded-full transition-all active:scale-90 shadow-lg ${isMuted ? 'bg-white text-[#075E54]' : 'bg-white/10 text-white hover:bg-white/20'}`}
        >
          {isMuted ? <MicOff className="h-7 w-7" /> : <Mic className="h-7 w-7" />}
        </button>
        
        <button className="grid h-16 w-16 place-items-center rounded-full bg-white/10 text-white transition-all hover:bg-white/20 active:scale-90 shadow-lg">
          <Volume2 className="h-7 w-7" />
        </button>
        
        <button 
          onClick={onEnd} 
          className="grid h-16 w-16 place-items-center rounded-full bg-[#FF4B4B] text-white transition-all hover:bg-red-400 active:scale-90 shadow-[0_0_20px_rgba(255,75,75,0.4)]"
        >
          <PhoneOff className="h-8 w-8" />
        </button>
      </div>

    </div>
  );
}