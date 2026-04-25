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
    <div className="flex flex-col h-full bg-[#0f172a] text-white overflow-hidden relative">
      {/* Background Ambient Effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -right-[10%] w-[60%] h-[60%] bg-emerald-500/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute -bottom-[20%] -left-[10%] w-[60%] h-[60%] bg-blue-500/10 rounded-full blur-[120px] animate-pulse delay-700" />
      </div>

      {/* Top Area */}
      <div className="relative pt-20 flex flex-col items-center">
        <div className="relative">
          {contact?.avatar ? (
            <div className="relative w-32 h-32 rounded-full p-1 bg-gradient-to-br from-emerald-500/50 to-blue-500/50 shadow-2xl">
              <img src={contact.avatar} className="w-full h-full rounded-full object-cover border-4 border-[#0f172a]" alt={contact.displayName} />
            </div>
          ) : (
            <div className="w-32 h-32 rounded-full bg-slate-800 flex items-center justify-center text-4xl border-4 border-[#0f172a] shadow-2xl">
              {contact?.displayName?.charAt(0) || <User size={48} />}
            </div>
          )}
          <div className="absolute -bottom-1 right-2 w-7 h-7 bg-emerald-500 rounded-full border-4 border-[#0f172a]" />
        </div>
        
        <h2 className="text-3xl font-black mt-8 tracking-tight">{contact?.displayName || contact?.name || 'Unknown User'}</h2>
        <div className="flex items-center gap-2 mt-3">
          <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            <p className="text-emerald-400 font-bold tracking-widest uppercase text-[10px]">Voice Call Active</p>
          </div>
        </div>
        <p className="text-6xl font-black mt-12 text-white/90 tabular-nums tracking-tighter">{formatTime(duration)}</p>
      </div>

      {/* Center - Visualizer / Animation */}
      <div className="relative flex-1 flex items-center justify-center">
        <div className="relative flex items-center justify-center">
          <div className="absolute w-80 h-80 bg-emerald-500/10 rounded-full animate-ping duration-[4s]" />
          <div className="absolute w-64 h-64 bg-emerald-500/5 rounded-full animate-ping duration-[3s] delay-1000" />
          <div className="w-64 h-64 bg-white/5 rounded-full flex items-center justify-center border border-white/5 backdrop-blur-3xl shadow-inner">
            <div className="text-8xl animate-pulse">🎙️</div>
          </div>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="relative pb-24 flex justify-center items-center gap-8 md:gap-16">
        <div className="flex flex-col items-center gap-3">
          <button 
            onClick={toggleMute}
            className={`w-16 h-16 rounded-full flex items-center justify-center transition-all active:scale-95 shadow-lg ${isMuted ? 'bg-red-500 text-white' : 'bg-white/10 hover:bg-white/20 border border-white/10 text-white'}`}
          >
            {isMuted ? <MicOff size={28} /> : <Mic size={28} />}
          </button>
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{isMuted ? 'Unmute' : 'Mute'}</span>
        </div>

        <div className="flex flex-col items-center gap-3">
          <button 
            onClick={onEnd}
            className="w-20 h-20 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-2xl shadow-red-900/40 transition-all hover:scale-110 active:scale-90"
          >
            <PhoneOff size={32} />
          </button>
          <span className="text-[10px] font-bold uppercase tracking-widest text-red-500">End Call</span>
        </div>

        <div className="flex flex-col items-center gap-3">
          <button className="w-16 h-16 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 flex items-center justify-center transition-all active:scale-95 shadow-lg text-white">
            <Volume2 size={28} />
          </button>
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Speaker</span>
        </div>
      </div>
    </div>
  );
}
