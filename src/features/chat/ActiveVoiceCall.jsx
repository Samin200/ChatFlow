import React from 'react';
import { createPortal } from 'react-dom';
import { LiveKitRoom, RoomAudioRenderer, useLocalParticipant } from '@livekit/components-react';
import { useState, useEffect } from 'react';
import { PhoneOff, Mic, MicOff, Volume2, User } from 'lucide-react';
import '@livekit/components-styles';

/**
 * ActiveVoiceCall - 2026 WhatsApp Replica
 * Renders via React Portal directly to document.body for true fullscreen overlay.
 */
export default function ActiveVoiceCall({ token, serverUrl, roomName, contact, state, onEnd }) {
  const [content, setContent] = useState(null);

  useEffect(() => {
    if (!token || !serverUrl) {
      const statusText = state === 'ringing' ? 'Incoming call...' : 'Calling...';
      
      setContent(
        <div className="fixed inset-0 z-[99999] h-[100dvh] w-[100dvw] bg-gradient-to-br from-[#0a0a0a] via-[#1a1a2e] to-[#16213e] flex flex-col items-center justify-between p-8 pt-safe pb-safe text-white animate-in fade-in duration-500 overflow-hidden pointer-events-auto">
          <div className="flex flex-col items-center mt-12 z-10">
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ring-pulse ring-4 ring-emerald-500/30" />
              <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-slate-900 shadow-2xl">
                {contact?.avatar ? (
                  <img src={contact.avatar} className="w-full h-full object-cover" alt={contact.displayName} />
                ) : (
                  <div className="w-full h-full bg-slate-800 flex items-center justify-center text-4xl">
                    {contact?.displayName?.charAt(0) || <User size={48} />}
                  </div>
                )}
              </div>
            </div>
            <h2 className="text-3xl font-bold mb-2 tracking-tight">{contact?.displayName || 'Unknown'}</h2>
            <p className="text-emerald-400 font-medium animate-pulse tracking-widest uppercase text-xs">{statusText}</p>
          </div>

          <div className="pb-24">
            <button 
              onClick={onEnd}
              className="w-20 h-20 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-2xl shadow-red-900/40 transition-all hover:scale-110 active:scale-90"
            >
              <PhoneOff size={32} />
            </button>
          </div>
        </div>
      );
    } else {
      setContent(
        <LiveKitRoom
          token={token}
          serverUrl={serverUrl}
          connect={true}
          audio={true}
          video={false}
          onDisconnected={onEnd}
          className="fixed inset-0 z-[99999] h-[100dvh] w-[100dvw] bg-gradient-to-br from-[#0a0a0a] via-[#1a1a2e] to-[#16213e] overflow-hidden pointer-events-auto"
        >
          <CallUI contact={contact} onEnd={onEnd} />
          <RoomAudioRenderer />
        </LiveKitRoom>
      );
    }
  }, [token, serverUrl, contact, state, onEnd]);

  if (!content) return null;
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

  const formatTime = (seconds) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  const toggleMute = () => {
    if (localParticipant) {
      localParticipant.setMicrophoneEnabled(isMuted);
      setIsMuted(!isMuted);
    }
  };

  return (
    <div className="flex flex-col h-full w-full text-white pt-safe pb-safe relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute inset-0 pointer-events-none opacity-30">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px]" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px]" />
      </div>

      {/* Top Bar */}
      <div className="relative z-10 pt-12 flex flex-col items-center">
        <div className="relative mb-6">
          <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-white/10 shadow-xl">
            {contact?.avatar ? (
              <img src={contact.avatar} className="w-full h-full object-cover" alt={contact.displayName} />
            ) : (
              <div className="w-full h-full bg-slate-800 flex items-center justify-center text-3xl">
                {contact?.displayName?.charAt(0) || <User size={32} />}
              </div>
            )}
          </div>
          <div className="absolute -bottom-1 right-2 w-6 h-6 bg-emerald-500 rounded-full border-4 border-[#0a0a0a]" />
        </div>
        
        <h2 className="text-xl font-bold tracking-tight">{contact?.displayName || 'Unknown User'}</h2>
        <p className="text-4xl font-mono mt-4 text-emerald-400 font-bold tracking-tighter tabular-nums">
          {formatTime(duration)}
        </p>
      </div>

      {/* Center - Animation */}
      <div className="flex-1 flex items-center justify-center relative z-10">
        <div className="relative flex items-center justify-center">
          <div className="absolute w-64 h-64 bg-emerald-500/5 rounded-full animate-ping duration-[3s]" />
          <div className="w-48 h-48 bg-white/5 rounded-full flex items-center justify-center border border-white/5 backdrop-blur-3xl shadow-inner">
            <svg className="w-24 h-24 text-white/20 animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="relative z-10 pb-20 flex justify-center items-center gap-10">
        <div className="flex flex-col items-center gap-3">
          <button 
            onClick={toggleMute}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-90 shadow-lg ${isMuted ? 'bg-white text-slate-900' : 'bg-white/10 hover:bg-white/20 border border-white/10 text-white'}`}
          >
            {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
          </button>
          <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Mute</span>
        </div>

        <button 
          onClick={onEnd}
          className="w-20 h-20 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-2xl shadow-red-900/40 transition-all hover:scale-110 active:scale-90"
        >
          <PhoneOff size={32} />
        </button>

        <div className="flex flex-col items-center gap-3">
          <button className="w-14 h-14 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 flex items-center justify-center transition-all active:scale-90 shadow-lg text-white">
            <Volume2 size={24} />
          </button>
          <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Speaker</span>
        </div>
      </div>
    </div>
  );
}
