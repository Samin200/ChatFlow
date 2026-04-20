import { useState, useEffect, useRef, useCallback } from "react";
import { subscribeSocketEvent, emitSocketEvent } from "../services/socketService.js";

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.openrelayproject.org:80" },
    { urls: "stun:stun.l.google.com:19302" },
    {
      urls: "turn:turn.openrelayproject.org:80",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:turn.openrelayproject.org:443",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
  ],
};

export function useWebRTC(currentUser, onCallEndedCallback) {
  const [callState, setCallState] = useState("idle"); // idle, ringing, calling, connected
  const [incomingCall, setIncomingCall] = useState(null); // { callId, callerId, chatId, offer }
  const [activeCall, setActiveCall] = useState(null); // { callId, targetId, chatId, isVideo }
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);

  const pcRef = useRef(null);
  const callDurationTimer = useRef(null);
  const callStartTime = useRef(null);
  
  // Use refs to avoid stale closures in socket listeners
  const callStateRef = useRef(callState);
  const activeCallRef = useRef(activeCall);
  const incomingCallRef = useRef(incomingCall);
  const onCallEndedCallbackRef = useRef(onCallEndedCallback);
  
  useEffect(() => { callStateRef.current = callState; }, [callState]);
  useEffect(() => { activeCallRef.current = activeCall; }, [activeCall]);
  useEffect(() => { incomingCallRef.current = incomingCall; }, [incomingCall]);
  useEffect(() => { onCallEndedCallbackRef.current = onCallEndedCallback; }, [onCallEndedCallback]);

  const cleanup = useCallback(() => {
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    setLocalStream(null);
    setRemoteStream(null);
    setCallState("idle");
    setActiveCall(null);
    setIncomingCall(null);
    if (callDurationTimer.current) {
      clearInterval(callDurationTimer.current);
      callDurationTimer.current = null;
    }
  }, [localStream]);

  const initPeerConnection = useCallback((targetId) => {
    if (pcRef.current) pcRef.current.close();
    
    const pc = new RTCPeerConnection({
      iceServers: [
        {
          urls: "stun:stun.l.google.com:19302"
        },
        {
          urls: "turn:openrelay.metered.ca:80",
          username: "openrelayproject",
          credential: "openrelayproject"
        },
        {
          urls: "turn:openrelay.metered.ca:443",
          username: "openrelayproject",
          credential: "openrelayproject"
        }
      ]
    });
    pcRef.current = pc;

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('[CALL] sending ICE candidate');
        emitSocketEvent("call:ice-candidate", {
          targetId,
          candidate: event.candidate,
        });
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log('[CALL] ICE state:', pc.iceConnectionState);
    };

    pc.ontrack = (event) => {
      console.log('[CALL] ontrack received, stream:', event.streams[0]?.id, 'tracks:', event.streams[0]?.getTracks().map(t => t.kind));
      setRemoteStream(event.streams[0]);
    };

    return pc;
  }, []);

  const initiateCall = useCallback(async (targetId, chatId, isVideo = false) => {
    console.log('[CALL] initiating call to:', targetId, 'isVideo:', isVideo);
    try {
      const audioConstraints = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      };
      console.log('[CALL] requesting getUserMedia with audio constraints:', audioConstraints, 'video:', isVideo);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: audioConstraints, 
        video: isVideo ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false 
      });
      console.log('[CALL] getUserMedia success, stream tracks:', stream.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled, id: t.id })));
      setLocalStream(stream);

      const pc = initPeerConnection(targetId);
      stream.getTracks().forEach((track) => {
        console.log('[CALL] adding track to peer connection:', track.kind);
        pc.addTrack(track, stream);
      });

      const offer = await pc.createOffer();
      console.log('[CALL] offer created:', offer.type, 'sdp length:', offer.sdp?.length);
      await pc.setLocalDescription(offer);
      console.log('[CALL] local description set');

      const callId = `call_${Date.now()}`;
      setCallState("calling");
      setActiveCall({ callId, targetId, chatId, isVideo });

      console.log('[CALL] emitting call:invite');
      emitSocketEvent("call:invite", {
        callId,
        targetId,
        chatId,
        offer,
        isVideo,
      });
    } catch (err) {
      console.error('[CALL] Failed to start call:', err.name, err.message);
      cleanup();
    }
  }, [cleanup, initPeerConnection]);

  const acceptCall = useCallback(async () => {
    const currentIncoming = incomingCallRef.current;
    if (!currentIncoming) return;
    console.log('[CALL] accepting call from:', currentIncoming.callerId);
    try {
      const { callerId, offer, isVideo, callId, chatId } = currentIncoming;
      
      const audioConstraints = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      };
      console.log('[CALL] requesting getUserMedia for answer');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: audioConstraints, 
        video: isVideo ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false 
      });
      console.log('[CALL] getUserMedia success, stream tracks:', stream.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled })));
      setLocalStream(stream);

      const pc = initPeerConnection(callerId);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      console.log('[CALL] remote description set');
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      console.log('[CALL] answer created and local description set');

      setCallState("connected");
      setActiveCall({ callId, targetId: callerId, chatId, isVideo });
      setIncomingCall(null);
      callStartTime.current = Date.now();

      console.log('[CALL] emitting call:accepted');
      emitSocketEvent("call:accepted", {
        callId,
        targetId: callerId,
        answer,
      });
    } catch (err) {
      console.error('[CALL] Failed to accept call', err);
      cleanup();
    }
  }, [initPeerConnection, cleanup]);

  const rejectCall = useCallback(() => {
    const currentIncoming = incomingCallRef.current;
    if (currentIncoming) {
      emitSocketEvent("call:rejected", {
        callId: currentIncoming.callId,
        targetId: currentIncoming.callerId,
      });
      setIncomingCall(null);
      setCallState("idle");
    }
  }, []);

  const endCall = useCallback(() => {
    const currentActive = activeCallRef.current;
    const currentIncoming = incomingCallRef.current;
    
    if (currentActive) {
      emitSocketEvent("call:ended", {
        callId: currentActive.callId,
        targetId: currentActive.targetId,
        chatId: currentActive.chatId,
      });
      
      if (callStartTime.current && onCallEndedCallbackRef.current) {
        const durationSec = Math.floor((Date.now() - callStartTime.current) / 1000);
        onCallEndedCallbackRef.current(currentActive.chatId, durationSec, currentActive.isVideo);
      }
    } else if (currentIncoming) {
      emitSocketEvent("call:rejected", {
        callId: currentIncoming.callId,
        targetId: currentIncoming.callerId,
      });
      setIncomingCall(null);
      setCallState("idle");
    }
    
    cleanup();
  }, [cleanup]);

  const toggleMic = useCallback(() => {
    if (localStream) {
      localStream.getAudioTracks().forEach(t => t.enabled = !t.enabled);
    }
  }, [localStream]);

  const toggleCamera = useCallback(() => {
    if (localStream) {
      localStream.getVideoTracks().forEach(t => t.enabled = !t.enabled);
    }
  }, [localStream]);

  // Socket Listeners
  useEffect(() => {
    if (!currentUser?.id) return;

    const handleInvite = (data) => {
      console.log('[CALL] call:invite received from:', data.callerId, 'isVideo:', data.isVideo);
      // Use ref to get latest state
      if (callStateRef.current !== "idle") {
        console.log('[CALL] rejecting invite - busy, current state:', callStateRef.current);
        emitSocketEvent("call:rejected", { callId: data.callId, targetId: data.callerId, reason: "busy" });
        return;
      }
      setIncomingCall(data);
      setCallState("ringing");
    };

    const handleAccepted = async (data) => {
      console.log('[CALL] call:accepted received');
      if (pcRef.current && data.answer) {
        try {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
          console.log('[CALL] remote description set on caller side, call connected');
          setCallState("connected");
          callStartTime.current = Date.now();
        } catch (err) {
          console.error('[CALL] Error setting remote description:', err);
        }
      }
    };

    const handleRejected = () => {
      cleanup();
    };

    const handleIceCandidate = async (data) => {
      console.log('[CALL] call:ice-candidate received');
      if (pcRef.current && data.candidate) {
        try {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
          console.log('[CALL] ICE candidate added successfully');
        } catch (e) {
          console.error('[CALL] Error adding ice candidate', e);
        }
      }
    };

    const handleEnded = () => {
      cleanup();
    };

    const unsubInvite = subscribeSocketEvent("call:invite", handleInvite);
    const unsubAccepted = subscribeSocketEvent("call:accepted", handleAccepted);
    const unsubRejected = subscribeSocketEvent("call:rejected", handleRejected);
    const unsubIce = subscribeSocketEvent("call:ice-candidate", handleIceCandidate);
    const unsubEnded = subscribeSocketEvent("call:ended", handleEnded);

    return () => {
      unsubInvite();
      unsubAccepted();
      unsubRejected();
      unsubIce();
      unsubEnded();
    };
  }, [currentUser?.id, cleanup]);

  return {
    callState,
    incomingCall,
    activeCall,
    localStream,
    remoteStream,
    initiateCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMic,
    toggleCamera
  };
}
