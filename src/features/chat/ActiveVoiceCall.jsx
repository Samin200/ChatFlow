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
      className="fixed inset-0 z-[99999] h-[100dvh] w-[100dvw] bg-gradient-to-br from-[#0a0a0a] via-[#1a1a2e] to-[#16213e] overflow-hidden"
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
    <div className="flex flex-col h-full text-white pt-safe pb-safe relative">
      {/* Top Info */}
      <div className="pt-12 flex flex-col items-center">
        <div className="relative w-28 h-28 rounded-full overflow-hidden border-4 border-white/20 mb-6">
          {contact?.avatar ? (
            <img src={contact.avatar} className="w-full h-full object-cover" alt="" />
          ) : (
            <div className="w-full h-full bg-slate-700 flex items-center justify-center text-5xl">
              {contact?.displayName?.[0] || <User size={48} />}
            </div>
          )}
        </div>

        <h2 className="text-2xl font-bold">{contact?.displayName || 'Unknown'}</h2>
        <p className="text-4xl font-mono tabular-nums mt-6 text-emerald-400">
          {formatTime(duration)}
        </p>
      </div>

      {/* Center Animation */}
      <div className="flex-1 flex items-center justify-center">
        <div className="relative">
          <div className="w-64 h-64 bg-emerald-500/10 rounded-full animate-ping" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-40 h-40 bg-white/5 backdrop-blur-3xl rounded-full flex items-center justify-center border border-white/10">
              <svg className="w-20 h-20 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="flex justify-center gap-12 pb-12">
        <button onClick={toggleMute} className="flex flex-col items-center gap-1.5">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center ${isMuted ? 'bg-white text-black' : 'bg-white/10'}`}>
            {isMuted ? <MicOff size={26} /> : <Mic size={26} />}
          </div>
          <span className="text-xs text-white/50">Mute</span>
        </button>

        <button onClick={onEnd} className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center active:scale-90 transition-transform">
          <PhoneOff size={32} />
        </button>

        <button className="flex flex-col items-center gap-1.5">
          <div className="w-14 h-14 bg-white/10 rounded-full flex items-center justify-center">
            <Volume2 size={26} />
          </div>
          <span className="text-xs text-white/50">Speaker</span>
        </button>
      </div>
    </div>
  );
}