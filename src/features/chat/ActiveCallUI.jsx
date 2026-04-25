import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  LiveKitRoom, 
  RoomAudioRenderer, 
  useLocalParticipant, 
  useParticipants,
  useTracks,
  VideoTrack,
  ParticipantContext
} from '@livekit/components-react';
import { PhoneOff, Mic, MicOff, Volume2, User, Video, VideoOff, SwitchCamera } from 'lucide-react';
import { Track } from 'livekit-client';

export default function ActiveCallUI({ token, serverUrl, contact, isVideo, onEnd }) {
  if (!token || !serverUrl) return null;

  return (
    <LiveKitRoom
      token={token}
      serverUrl={serverUrl}
      connect={true}
      audio={true}
      video={isVideo}
      onDisconnected={onEnd}
      className="fixed inset-0 z-[99999] h-[100dvh] w-[100dvw] overflow-hidden"
      style={{
        background: isVideo ? "#000" : "radial-gradient(120% 60% at 50% 0%, var(--color-accent) 0%, color-mix(in srgb, var(--color-accent) 70%, black) 55%, var(--color-surface) 100%)"
      }}
    >
      <CallUI contact={contact} isVideo={isVideo} onEnd={onEnd} />
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}

function CallUI({ contact, isVideo, onEnd }) {
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled } = useLocalParticipant();
  const participants = useParticipants();
  const tracks = useTracks([Track.Source.Camera]);
  
  // Find the first remote participant with a video track
  const remoteParticipant = useMemo(() => {
    if (!participants) return null;
    return participants.find(p => p.identity !== localParticipant?.identity);
  }, [participants, localParticipant]);

  const remoteVideoTrack = useMemo(() => {
    return tracks.find(t => t.participant.identity === remoteParticipant?.identity);
  }, [tracks, remoteParticipant]);

  const localVideoTrack = useMemo(() => {
    return tracks.find(t => t.participant.identity === localParticipant?.identity);
  }, [tracks, localParticipant]);

  const [isSpeaker, setIsSpeaker] = useState(true);
  const [duration, setDuration] = useState(0);
  const [optimisticMute, setOptimisticMute] = useState(null);
  const [optimisticVideo, setOptimisticVideo] = useState(null);

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
      // isMicrophoneEnabled is true if mic is active.
      // We want to flip that.
      const currentEnabled = isMicrophoneEnabled;
      const nextEnabled = !currentEnabled;
      setOptimisticMute(!nextEnabled); // if nextEnabled is false, we are muted
      try {
        await localParticipant.setMicrophoneEnabled(nextEnabled);
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

  const switchCamera = async () => {
    if (localParticipant) {
      try {
        console.log("Switching camera...");
      } catch (err) {
        console.error("Failed to switch camera:", err);
      }
    }
  };

  const toggleSpeaker = () => {
    setIsSpeaker(!isSpeaker);
  };

  const isMuted = optimisticMute !== null ? optimisticMute : !isMicrophoneEnabled;
  const isCamOff = optimisticVideo !== null ? optimisticVideo : !isCameraEnabled;

  // Show PiP if it's a video call OR if the camera is currently enabled
  const showPiP = isVideo || !isCamOff;

  if (!participants) return null;

  return (
    <div className="relative flex h-full w-full flex-col text-white pt-safe pb-safe justify-between">
      
      {/* Background Video (Remote) */}
      {isVideo && remoteParticipant && (
        <div className="absolute inset-0 z-0">
          {remoteVideoTrack ? (
            <VideoTrack 
              trackRef={remoteVideoTrack}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-black flex items-center justify-center">
              <User className="w-20 h-20 opacity-20" />
            </div>
          )}
          <div className="absolute inset-0 bg-black/10 pointer-events-none" />
        </div>
      )}

      {/* Top Info */}
      <div className={`px-6 pt-8 md:pt-12 text-center z-10 shrink-0 transition-opacity ${isVideo && !isCamOff ? 'opacity-80' : 'opacity-100'}`}>
        <p className="text-[10px] sm:text-xs uppercase tracking-[0.28em] opacity-60 font-medium">ChatFlow {isVideo ? 'video' : 'voice'}</p>
        <p className="mt-2 sm:mt-3 text-2xl sm:text-3xl font-semibold tracking-[-0.03em] drop-shadow-md">{contact?.displayName || 'Unknown'}</p>
        <p className="mt-1 sm:mt-2 text-[10px] sm:text-xs opacity-60 font-medium">end-to-end encrypted · LiveKit</p>
      </div>

      {/* Center UI (Only for Voice or if no remote video) */}
      {(!isVideo || !remoteParticipant) && (
        <div className="relative flex-1 flex flex-col items-center justify-center z-10 py-4 min-h-[200px]">
          <div className="relative grid h-40 w-40 md:h-48 md:w-48 place-items-center">
            <span className="absolute h-full w-full animate-ping rounded-full bg-white/5 duration-1000" />
            <span className="absolute h-3/4 w-3/4 animate-pulse rounded-full bg-white/10 duration-700" />
            
            <div className="relative h-3/4 w-3/4 overflow-hidden rounded-full shadow-2xl ring-4 ring-black/10" style={{ backgroundColor: 'var(--color-surface)' }}>
              {contact?.avatar ? (
                <img src={contact.avatar} className="w-full h-full object-cover" alt="" />
              ) : (
                <div 
                  className="grid h-full w-full place-items-center text-4xl md:text-6xl font-semibold text-white"
                  style={{ background: 'linear-gradient(135deg, var(--color-accent), var(--color-primary))' }}
                >
                  {contact?.displayName?.[0] || <User className="w-10 h-10 md:w-14 md:h-14" />}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PiP Local Video (Self-view) */}
      {showPiP && (
        <div className="absolute top-8 right-6 w-32 md:w-40 aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 z-20 bg-slate-900 group">
          {isCamOff ? (
            <div className="w-full h-full flex items-center justify-center bg-slate-800">
              <User className="w-8 h-8 opacity-40" />
            </div>
          ) : (
            localVideoTrack ? (
              <VideoTrack 
                trackRef={localVideoTrack} 
                className="w-full h-full object-cover"
                style={{ transform: 'scaleX(-1)' }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-slate-800">
                <User className="w-8 h-8 opacity-40" />
              </div>
            )
          )}
          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <button onClick={switchCamera} className="p-2 rounded-full bg-white/20 hover:bg-white/40 transition-colors">
              <SwitchCamera className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Waveform & Timer (Voice Only or Overlay) */}
      <div className="px-6 z-10 shrink-0">
        <p className="text-center text-xs sm:text-sm font-medium opacity-70 tracking-widest tabular-nums drop-shadow-md">{formatTime(duration)}</p>
        {!isVideo && (
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
        )}
      </div>

      {/* Bottom Controls */}
      <div className="mt-6 mb-4 sm:mb-10 flex items-center justify-center gap-4 sm:gap-8 w-full max-w-md mx-auto z-10 shrink-0">
        <div className="flex flex-col items-center gap-2">
          <button 
            onClick={toggleMute} 
            className={`grid h-14 w-14 sm:h-16 sm:w-16 place-items-center rounded-full transition-all active:scale-95 shadow-xl ${isMuted ? 'bg-white text-[#0B141A]' : 'bg-white/10 text-white hover:bg-white/20 backdrop-blur-md'}`}
          >
            {isMuted ? <MicOff className="h-6 w-6 sm:h-7 sm:w-7" /> : <Mic className="h-6 w-6 sm:h-7 sm:w-7" />}
          </button>
          <span className="text-[10px] uppercase tracking-widest font-bold opacity-60">Mute</span>
        </div>

        <div className="flex flex-col items-center gap-2">
          <button 
            onClick={toggleVideo} 
            className={`grid h-14 w-14 sm:h-16 sm:w-16 place-items-center rounded-full transition-all active:scale-95 shadow-xl ${isCamOff ? 'bg-white text-[#0B141A]' : 'bg-white/10 text-white hover:bg-white/20 backdrop-blur-md'}`}
          >
            {isCamOff ? <VideoOff className="h-6 w-6 sm:h-7 sm:w-7" /> : <Video className="h-6 w-6 sm:h-7 sm:w-7" />}
          </button>
          <span className="text-[10px] uppercase tracking-widest font-bold opacity-60">Camera</span>
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

        {!isVideo && (
          <div className="flex flex-col items-center gap-2">
            <button 
              onClick={toggleSpeaker}
              className={`grid h-14 w-14 sm:h-16 sm:w-16 place-items-center rounded-full transition-all active:scale-95 shadow-xl ${!isSpeaker ? 'bg-white text-[#0B141A]' : 'bg-white/10 text-white hover:bg-white/20 backdrop-blur-md'}`}
            >
              <Volume2 className="h-6 w-6 sm:h-7 sm:w-7" />
            </button>
            <span className="text-[10px] uppercase tracking-widest font-bold opacity-60">Speaker</span>
          </div>
        )}
      </div>

    </div>
  );
}