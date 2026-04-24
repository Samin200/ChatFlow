import { LiveKitRoom, RoomAudioRenderer, useLocalParticipant } from '@livekit/components-react';
import { useState, useEffect } from 'react';
import { PhoneOff, Mic, MicOff, Volume2, User } from 'lucide-react';
import '@livekit/components-styles';

export default function ActiveVoiceCall({ token, serverUrl, roomName, contact, state, onEnd }) {
  if (!token || !serverUrl) {
    const statusText = state === 'ringing' ? 'Incoming call...' : 'Calling...';
    
    return (
      <div className="fixed inset-0 bg-[#0f172a] z-50 flex flex-col items-center justify-center text-white">
        <div className="pt-20 flex flex-col items-center flex-1">
          <div className="relative mb-10">
            <div className="absolute inset-0 bg-emerald-500/10 rounded-full animate-ping duration-[3s]" />
            {contact?.avatar ? (
              <img src={contact.avatar} className="relative w-32 h-32 rounded-full object-cover border-2 border-white/10 shadow-2xl" alt={contact.displayName} />
            ) : (
              <div className="relative w-32 h-32 rounded-full bg-slate-800 flex items-center justify-center text-4xl border-2 border-white/10">
                {contact?.displayName?.charAt(0) || <User size={48} />}
              </div>
            )}
          </div>
          <h2 className="text-3xl font-bold mb-2">{contact?.displayName || 'Unknown'}</h2>
          <p className="text-emerald-400 font-medium animate-pulse uppercase tracking-widest text-sm">{statusText}</p>
        </div>

        <div className="pb-24">
          <button 
            onClick={onEnd}
            className="w-20 h-20 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-xl transition-all hover:scale-110 active:scale-90"
          >
            <PhoneOff size={32} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <LiveKitRoom
      token={token}
      serverUrl={serverUrl}
      connect={true}
      audio={true}
      video={false}
      onDisconnected={onEnd}
      className="fixed inset-0 bg-[#0f172a] z-50"
    >
      <CallUI contact={contact} onEnd={onEnd} />
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
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
    <div className="flex flex-col h-full text-white">
      {/* Top Area */}
      <div className="pt-20 flex flex-col items-center">
        <div className="relative">
          {contact?.avatar ? (
            <img src={contact.avatar} className="w-32 h-32 rounded-full object-cover border-2 border-white/10 shadow-2xl" alt={contact.displayName} />
          ) : (
            <div className="w-32 h-32 rounded-full bg-slate-800 flex items-center justify-center text-4xl border-2 border-white/10">
              {contact?.displayName?.charAt(0) || <User size={48} />}
            </div>
          )}
          <div className="absolute -bottom-2 right-4 w-6 h-6 bg-emerald-500 rounded-full border-4 border-[#0f172a]" />
        </div>
        
        <h2 className="text-3xl font-bold mt-8 tracking-tight">{contact?.displayName || contact?.name || 'Unknown User'}</h2>
        <div className="flex items-center gap-2 mt-2">
          <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
          <p className="text-emerald-400 font-medium tracking-wide uppercase text-xs">Voice Call</p>
        </div>
        <p className="text-5xl font-mono mt-10 text-slate-300 font-light">{formatTime(duration)}</p>
      </div>

      {/* Center - Visualizer / Animation */}
      <div className="flex-1 flex items-center justify-center">
        <div className="relative flex items-center justify-center">
          <div className="absolute w-64 h-64 bg-emerald-500/10 rounded-full animate-ping duration-[3s]" />
          <div className="absolute w-48 h-48 bg-emerald-500/5 rounded-full animate-ping duration-[2s] delay-700" />
          <div className="w-56 h-56 bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 rounded-full flex items-center justify-center border border-white/5 backdrop-blur-3xl">
            <div className="text-7xl animate-bounce duration-[4s]">📞</div>
          </div>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="pb-24 flex justify-center items-center gap-10 md:gap-16">
        <button 
          onClick={toggleMute}
          className={`w-16 h-16 rounded-full flex items-center justify-center transition-all active:scale-95 ${isMuted ? 'bg-red-500/20 text-red-500 border border-red-500/50' : 'bg-white/5 hover:bg-white/10 border border-white/10'}`}
        >
          {isMuted ? <MicOff size={28} /> : <Mic size={28} />}
        </button>

        <button 
          onClick={onEnd}
          className="w-20 h-20 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-xl shadow-red-900/20 transition-all hover:scale-110 active:scale-90"
        >
          <PhoneOff size={32} />
        </button>

        <button className="w-16 h-16 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-all active:scale-95">
          <Volume2 size={28} />
        </button>
      </div>
    </div>
  );
}
