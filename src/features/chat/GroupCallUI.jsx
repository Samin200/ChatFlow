import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  LiveKitRoom, 
  RoomAudioRenderer, 
  useParticipants, 
  useLocalParticipant,
  GridLayout,
  ParticipantTile
} from '@livekit/components-react';
import { PhoneOff, Mic, MicOff, Video, VideoOff, Users, Lock } from 'lucide-react';

export default function GroupCallUI({ token, serverUrl, chatName, onEnd }) {
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
      <CallUI chatName={chatName} onEnd={onEnd} />
      <RoomAudioRenderer />
    </LiveKitRoom>
  );

  return createPortal(content, document.body);
}

function CallUI({ chatName, onEnd }) {
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
        setTimeout(() => setOptimisticMute(null), 2000);
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
        setTimeout(() => setOptimisticVideo(null), 2000);
      }
    }
  };

  const isMuted = optimisticMute ?? !isMicrophoneEnabled;
  const isVideoOff = optimisticVideo ?? !isCameraEnabled;

  if (!participants) return null;

  return (
    <div className="relative flex h-full w-full flex-col text-white pt-safe pb-safe px-4 sm:px-6">
      
      {/* Header */}
      <div className="flex justify-between items-start pt-6 sm:pt-8 z-10 shrink-0">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] opacity-50 font-medium">LiveKit Group Room</p>
          <h2 className="text-3xl font-bold mt-1 tracking-tight drop-shadow-md">{chatName || 'Friends'}</h2>
          <p className="text-xs opacity-60 mt-1 font-medium">
            {participants.length} connected · {formatTime(duration)}
          </p>
        </div>
        <div className="bg-[#25D366] text-[#0B141A] px-2 py-0.5 rounded text-[10px] font-black tracking-tighter shadow-lg">HD</div>
      </div>

      {/* Grid - Flexible LiveKit Grid */}
      <div className="flex-1 min-h-0 py-8 relative">
        <GridLayout participants={participants} className="h-full">
          <ParticipantTile />
        </GridLayout>
      </div>

      {/* Bottom Controls */}
      <div className="mb-6 sm:mb-10 flex justify-center gap-4 sm:gap-8 items-center z-10 shrink-0">
        <div className="flex flex-col items-center gap-2">
          <button 
            onClick={toggleMute}
            className={`grid h-14 w-14 sm:h-16 sm:w-16 place-items-center rounded-full transition-all active:scale-90 shadow-xl ${isMuted ? 'bg-white text-[#0B141A]' : 'bg-[#1E2A32]/80 backdrop-blur-md text-white hover:bg-[#2A3942]'}`}
          >
            {isMuted ? <MicOff className="h-6 w-6 sm:h-7 sm:w-7" /> : <Mic className="h-6 w-6 sm:h-7 sm:w-7" />}
          </button>
          <span className="text-[10px] uppercase tracking-widest font-bold opacity-60">Mute</span>
        </div>

        <div className="flex flex-col items-center gap-2">
          <button 
            onClick={toggleVideo}
            className={`grid h-14 w-14 sm:h-16 sm:w-16 place-items-center rounded-full transition-all active:scale-90 shadow-xl ${isVideoOff ? 'bg-white text-[#0B141A]' : 'bg-[#1E2A32]/80 backdrop-blur-md text-white hover:bg-[#2A3942]'}`}
          >
            {isVideoOff ? <VideoOff className="h-6 w-6 sm:h-7 sm:w-7" /> : <Video className="h-6 w-6 sm:h-7 sm:w-7" />}
          </button>
          <span className="text-[10px] uppercase tracking-widest font-bold opacity-60">Camera</span>
        </div>
        
        <div className="flex flex-col items-center gap-2">
          <button 
            onClick={onEnd} 
            className="grid h-14 w-14 sm:h-16 sm:w-16 place-items-center rounded-full bg-[#FF4B4B] text-white transition-all hover:bg-rose-600 active:scale-90 shadow-[0_0_25px_rgba(255,75,75,0.4)]"
          >
            <PhoneOff className="h-7 w-7 sm:h-8 sm:w-8" />
          </button>
          <span className="text-[10px] uppercase tracking-widest font-bold opacity-60">End</span>
        </div>
      </div>

    </div>
  );
}
