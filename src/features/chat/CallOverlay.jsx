import { useEffect, useRef, useState, useCallback } from "react";

export default function CallOverlay({
  callState,
  incomingCall,
  activeCall,
  localStream,
  remoteStream,
  acceptCall,
  rejectCall,
  endCall,
  toggleMic,
  toggleCamera,
}) {
  console.log('[CALL] CallOverlay render - callState:', callState, 'hasLocalStream:', !!localStream, 'hasRemoteStream:', !!remoteStream, 'activeCall:', activeCall);
  
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null); // Separate ref for voice calls
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);

  // Determine if this is a video call (needed for stream attachment logic)
  const isVideo = activeCall?.isVideo || (localStream?.getVideoTracks().length > 0);

  useEffect(() => {
    console.log('[CALL] localStream effect - hasStream:', !!localStream, 'hasRef:', !!localVideoRef.current);
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, callState]);

  useEffect(() => {
    console.log('[CALL] remoteStream effect - hasStream:', !!remoteStream, 'isVideo:', isVideo, 'videoRef:', !!remoteVideoRef.current, 'audioRef:', !!remoteAudioRef.current);
    
    if (!remoteStream) return;

    // For video calls, attach to video element
    if (isVideo && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
      console.log('[CALL] remoteStream attached to video element, calling play()');
      remoteVideoRef.current.play().catch(err => {
        console.error('[CALL] Video play failed:', err);
      });
    }
    
    // For voice calls, attach to audio element
    if (!isVideo && remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = remoteStream;
      remoteAudioRef.current.muted = false;
      console.log('[CALL] remoteStream attached to audio element, calling play()');
      remoteAudioRef.current.play().catch(err => {
        console.error('[CALL] Audio play failed:', err);
      });
    }
  }, [remoteStream, callState, isVideo]);

  // --- Web Audio Ringtone Logic ---
  const audioCtxRef = useRef(null);
  const ringtoneTimerRef = useRef(null);

  const stopRingtone = useCallback(() => {
    if (ringtoneTimerRef.current) {
      clearInterval(ringtoneTimerRef.current);
      ringtoneTimerRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
  }, []);

  const playRingCycle = useCallback(() => {
    if (!audioCtxRef.current) return;
    try {
      const now = audioCtxRef.current.currentTime;
      // Dual-tone: 440Hz + 480Hz (US standard)
      const osc1 = audioCtxRef.current.createOscillator();
      const osc2 = audioCtxRef.current.createOscillator();
      const gain = audioCtxRef.current.createGain();

      osc1.frequency.setValueAtTime(440, now);
      osc2.frequency.setValueAtTime(480, now);
      
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.15, now + 0.1);
      gain.gain.setValueAtTime(0.15, now + 2);
      gain.gain.linearRampToValueAtTime(0, now + 2.1);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(audioCtxRef.current.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 2.1);
      osc2.stop(now + 2.1);
    } catch (err) {
      console.warn("AudioContext error:", err);
    }
  }, []);

  useEffect(() => {
    if (callState === "ringing" && incomingCall) {
      // Start Ringing
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
        playRingCycle();
        ringtoneTimerRef.current = setInterval(playRingCycle, 3000);
      }
    } else {
      stopRingtone();
    }
    return () => stopRingtone();
  }, [callState, incomingCall, playRingCycle, stopRingtone]);
  // ---------------------------------

  const handleAcceptCall = () => {
    console.log('[CALL] accept button clicked');
    acceptCall();
  };

  const handleRejectCall = () => {
    console.log('[CALL] reject/decline button clicked');
    rejectCall();
  };

  const handleEndCall = () => {
    console.log('[CALL] end call button clicked');
    endCall();
  };

  const handleToggleMic = () => {
    console.log('[CALL] toggle mic');
    toggleMic();
    setIsMicMuted(!isMicMuted);
  };

  const handleToggleCamera = () => {
    console.log('[CALL] toggle camera');
    toggleCamera();
    setIsCamOff(!isCamOff);
  };

  if (callState === "idle" && !incomingCall) return null;

  // Render Incoming Call Banner
  if (callState === "ringing" && incomingCall) {
    return (
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] max-w-sm w-full mx-4 shadow-2xl rounded-2xl p-4 overflow-hidden animate-in slide-in-from-top-10" style={{ backgroundColor: "color-mix(in srgb, var(--color-surface) 95%, black 5%)", borderColor: "color-mix(in srgb, var(--color-text) 14%, transparent)", borderWidth: 1 }}>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full flex items-center justify-center relative shadow-lg" style={{ backgroundColor: "var(--color-accent)" }}>
            <span className="text-white font-bold text-lg animate-pulse">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M2.99 7.625A1 1 0 013.989 7c4.61 0 8.878 1.95 11.83 5.42a1 1 0 01-1.54 1.28A13.96 13.96 0 004 8.99a1 1 0 01-1.01-1.365z"/>
                <path d="M12.44 19.55a1 1 0 01-1.55-1.28 11.96 11.96 0 00-6.89-6.32 1 1 0 011.02-1.37 13.96 13.96 0 018.06 7.69z"/>
                <path d="M20.9 21.05A17.93 17.93 0 002.95 3.1a1 1 0 101.42 1.41A15.93 15.93 0 0122.31 22.46a1 1 0 10-1.41-1.41z" />
              </svg>
            </span>
            <div className="absolute inset-0 rounded-full border-2 border-white animate-ping opacity-50" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold" style={{ color: "var(--color-text)" }}>Incoming {incomingCall.isVideo ? "Video" : "Voice"} Call</h4>
            <p className="text-sm opacity-70" style={{ color: "var(--color-text-muted)" }}>Would you like to answer?</p>
          </div>
        </div>
        <div className="flex gap-2 mt-4 mt-4">
          <button onClick={handleRejectCall} className="flex-1 py-2 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors">
            Decline
          </button>
          <button onClick={handleAcceptCall} className="flex-1 py-2 rounded-xl text-sm font-semibold text-white bg-green-500 hover:bg-green-600 transition-colors">
            Accept
          </button>
        </div>
      </div>
    );
  }

  // Active Call Overlay Frame
  return (
    <div className="fixed inset-0 z-[150] flex flex-col bg-slate-950/90 backdrop-blur-sm animate-in fade-in">
      <div className="flex-1 relative flex items-center justify-center p-6">
        {isVideo ? (
          <div className="w-full h-full max-w-5xl rounded-3xl overflow-hidden relative bg-black shadow-2xl border" style={{ borderColor: 'color-mix(in srgb, var(--color-surface) 30%, transparent)' }}>
            {/* Main Remote Video */}
            <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
            
            {/* PIP Local Video */}
            <div className="absolute bottom-6 right-6 w-32 md:w-48 aspect-[3/4] md:aspect-video rounded-xl overflow-hidden border-2 shadow-2xl" style={{ borderColor: "var(--color-surface)", backgroundColor: "#111" }}>
              {isCamOff ? (
                <div className="w-full h-full flex items-center justify-center">
                  <svg className="w-10 h-10 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
              ) : (
                <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" style={{ transform: "scaleX(-1)" }} />
              )}
            </div>

            {callState !== "connected" && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                <p className="text-white text-xl animate-pulse font-medium">{callState === "calling" ? "Connecting..." : "Ringing..."}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-6">
            <div className="w-32 h-32 rounded-full shadow-2xl flex items-center justify-center relative" style={{ backgroundColor: "var(--color-surface)" }}>
              <div className="absolute inset-0 rounded-full bg-cyan-400/20 animate-ping" style={{ animationDuration: '2s' }} />
              <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24" style={{ color: "var(--color-text)" }}>
                 <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3z"></path>
                 <path d="M19 10v1a7 7 0 0 1-14 0v-1H3v1a9 9 0 0 0 8 8.94V23h2v-3.06A9 9 0 0 0 21 11v-1h-2z"></path>
              </svg>
            </div>
            <div className="text-center">
              <h2 className="text-3xl font-bold" style={{ color: "var(--color-text)" }}>Active Call</h2>
              <p className="mt-2 text-lg animate-pulse" style={{ color: "var(--color-text-muted)" }}>
                {callState === "connected" ? "Connected" : "Ringing..."}
              </p>
            </div>
            {/* Audio element for voice calls - using separate ref */}
            <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />
          </div>
        )}
      </div>

      {/* Controls Footer */}
      <div className="h-24 px-8 flex items-center justify-center gap-6 bg-gradient-to-t from-black/80 to-transparent">
        <button
          onClick={handleToggleMic}
          className="w-14 h-14 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95 text-white"
          style={{ backgroundColor: isMicMuted ? "#ef4444" : "var(--color-surface)" }}
        >
          {isMicMuted ? (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /></svg>
          ) : (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
          )}
        </button>

        {isVideo && (
          <button
            onClick={handleToggleCamera}
            className="w-14 h-14 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95 text-white"
            style={{ backgroundColor: isCamOff ? "#ef4444" : "var(--color-surface)" }}
          >
            {isCamOff ? (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" /></svg>
            ) : (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
            )}
          </button>
        )}

        <button
          onClick={handleEndCall}
          className="w-16 h-16 rounded-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 bg-red-500 text-white shadow-lg shadow-red-500/20"
        >
          <svg className="w-8 h-8 rotate-135" fill="currentColor" viewBox="0 0 24 24" style={{ transform: "rotate(135deg)" }}>
            <path d="M2.99 7.625A1 1 0 013.989 7c4.61 0 8.878 1.95 11.83 5.42a1 1 0 01-1.54 1.28A13.96 13.96 0 004 8.99a1 1 0 01-1.01-1.365z"/>
          </svg>
        </button>
      </div>

    </div>
  );
}
