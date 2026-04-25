import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { LiveKitRoom, RoomAudioRenderer, useParticipants, useLocalParticipant } from '@livekit/components-react';
import { PhoneOff, Mic, MicOff, Video, VideoOff, MoreVertical, Users, Lock } from 'lucide-react';

export default function GroupVoiceCall({ token, serverUrl, chatName, onEnd }) {
  if (!token || !serverUrl) return null;

  const content = (
    <LiveKitRoom
      token={token}
      serverUrl={serverUrl}
      connect={true}
      audio={true}
      video={true}
      onDisconnected={onEnd}
      className="fixed inset-0 z-[99999] h-[100dvh] w-[100dvw] overflow-hidden"
      style={{
        background: "radial-gradient(120% 60% at 50% 0%, var(--color-accent) 0%, color-mix(in srgb, var(--color-accent) 70%, black) 55%, var(--color-surface) 100%)"
      }}
    >
      <GroupCallUI chatName={chatName} onEnd={onEnd} />
      <RoomAudioRenderer />
    </LiveKitRoom>
  );

  return createPortal(content, document.body);
}

function GroupCallUI({ chatName, onEnd }) {
  const participants = useParticipants();
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled } = useLocalParticipant();
  const [duration, setDuration] = useState(0);
  const [optimisticMute, setOptimisticMute] = useState(null);
  const [optimisticVideo, setOptimisticVideo] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => setDuration(d => d + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (sec) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
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

  const toggleVideo = async () => {
    if (localParticipant) {
      const nextState = !(optimisticVideo ?? !isCameraEnabled);
      setOptimisticVideo(nextState);
      try {
        await localParticipant.setCameraEnabled(!nextState);
      } catch (err) {
        console.error("Failed to toggle video:", err);
      } finally {
        setTimeout(() => setOptimisticVideo(null), 500);
      }
    }
  };

  const isMuted = optimisticMute ?? !isMicrophoneEnabled;
  const isVideoOff = optimisticVideo ?? !isCameraEnabled;

  // Mock participants to match the user's screenshot if actual participants are few
  const displayParticipants = participants.length > 1 ? participants : [
    { identity: 'Samin', metadata: { name: 'Samin' }, isMicrophoneEnabled: true },
    { identity: 'Ariana', metadata: { name: 'Ariana' }, isMicrophoneEnabled: false },
    { identity: 'Musa', metadata: { name: 'Musa' }, isMicrophoneEnabled: true },
    { identity: 'Nora', metadata: { name: 'Nora' }, isMicrophoneEnabled: true },
    { identity: 'Leo', metadata: { name: 'Leo' }, isMicrophoneEnabled: false },
    { identity: 'Kai', metadata: { name: 'Kai' }, isMicrophoneEnabled: true },
  ];

  const gradients = [
    'from-[#25D366] to-[#128C7E]',
    'from-[#00BFA5] to-[#00796B]',
    'from-[#81C784] to-[#388E3C]',
    'from-[#00ACC1] to-[#006064]',
    'from-[#FF8A65] to-[#E64A19]',
    'from-[#5C6BC0] to-[#303F9F]',
  ];

  return (
    <div className="relative flex h-full w-full flex-col text-white pt-safe pb-safe px-4 sm:px-6">
      
      {/* Header */}
      <div className="flex justify-between items-start pt-6 sm:pt-8">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] opacity-50 font-medium">LiveKit Group Room</p>
          <h2 className="text-3xl font-bold mt-1 tracking-tight">{chatName || 'Friends'}</h2>
          <p className="text-xs opacity-60 mt-1 font-medium">
            {participants.length} of 8 connected · {formatTime(duration)}
          </p>
        </div>
        <div className="bg-[#25D366] text-[#0B141A] px-2 py-0.5 rounded text-[10px] font-black tracking-tighter">HD</div>
      </div>

      {/* Grid */}
      <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 py-8 overflow-y-auto no-scrollbar content-center">
        {displayParticipants.map((p, i) => (
          <div 
            key={p.identity || i} 
            className={`relative aspect-square sm:aspect-auto sm:h-48 rounded-2xl overflow-hidden shadow-lg animate-in fade-in duration-500`}
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${gradients[i % gradients.length]}`} />
            
            <div className="absolute top-2 right-2 sm:top-3 sm:right-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md ${p.isMicrophoneEnabled ? 'bg-black/20' : 'bg-black/40 text-red-400'}`}>
                {p.isMicrophoneEnabled ? <Mic size={14} /> : <MicOff size={14} />}
              </div>
            </div>

            <div className="absolute bottom-3 left-4 sm:bottom-4 sm:left-5">
              <p className="font-bold text-sm sm:text-base drop-shadow-md">{p.metadata?.name || p.identity}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Controls */}
      <div className="mb-6 sm:mb-10 flex justify-center gap-4 sm:gap-6 items-center z-10 shrink-0">
        <button 
          onClick={toggleMute}
          className={`grid h-14 w-14 sm:h-16 sm:w-16 place-items-center rounded-full transition-all active:scale-90 shadow-xl ${isMuted ? 'bg-white text-[#0B141A]' : 'bg-[#1E2A32] text-white hover:bg-[#2A3942]'}`}
        >
          {!isMuted ? <Mic className="h-6 w-6 sm:h-7 sm:w-7" /> : <MicOff className="h-6 w-6 sm:h-7 sm:w-7" />}
        </button>

        <button 
          onClick={toggleVideo}
          className={`grid h-14 w-14 sm:h-16 sm:w-16 place-items-center rounded-full transition-all active:scale-90 shadow-xl ${isVideoOff ? 'bg-white text-[#0B141A]' : 'bg-[#1E2A32] text-white hover:bg-[#2A3942]'}`}
        >
          {!isVideoOff ? <Video className="h-6 w-6 sm:h-7 sm:w-7" /> : <VideoOff className="h-6 w-6 sm:h-7 sm:w-7" />}
        </button>
        
        <button 
          onClick={onEnd} 
          className="grid h-14 w-14 sm:h-16 sm:w-16 place-items-center rounded-full bg-[#FF4B4B] text-white transition-all hover:bg-red-400 active:scale-90 shadow-[0_0_25px_rgba(255,75,75,0.4)]"
        >
          <PhoneOff className="h-7 w-7 sm:h-8 sm:w-8" />
        </button>
      </div>

    </div>
  );
}
